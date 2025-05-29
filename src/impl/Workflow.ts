import {
  NonRetryableErrorConstructor,
  WorkflowEntrypointConstructor,
  WorkflowEvent,
} from "../workflows";
import { PauseControl } from "./PauseControl";
import { WorkflowInstance } from "./WorkflowInstance";
import { TerminatedError, WorkflowStepImpl } from "./WorkflowStepImpl";

export type WorkflowInstanceCreateOptions<Params> = Readonly<{
  id?: string;
  params: Params;
}>;

export class Workflow<Adapters, Params> {
  private readonly instanceById = new Map<string, WorkflowInstance>();

  constructor(
    private readonly entrypointConstructor: WorkflowEntrypointConstructor<
      Adapters,
      Params
    >,
    private readonly NonRetryableError: NonRetryableErrorConstructor = Error,
  ) {}

  async create(
    options: WorkflowInstanceCreateOptions<Params>,
    adapters: Adapters,
  ): Promise<WorkflowInstance> {
    const entrypoint = new this.entrypointConstructor(
      adapters,
      this.NonRetryableError,
    );

    const id = options.id || crypto.randomUUID();

    const stepPauseControl = new PauseControl();
    const finishedPauseControl = new PauseControl(false);
    const workflowStep = new WorkflowStepImpl(stepPauseControl);
    const instance = new WorkflowInstance(
      id,
      stepPauseControl,
      finishedPauseControl,
      workflowStep,
    );
    this.instanceById.set(id, instance);

    const event: WorkflowEvent<Params> = {
      payload: options.params,
      timestamp: new Date(),
      instanceId: id,
    };
    entrypoint
      .run(event, workflowStep)
      .then(() => {
        instance.setStatus({ status: "completed" });
        finishedPauseControl.resume();
      })
      .catch((error) => {
        if (error instanceof TerminatedError) {
          instance.setStatus({ status: "terminated", error: error.message });
        } else {
          instance.setStatus({ status: "errored", error: error.message });
        }
        finishedPauseControl.resume();
      });

    return instance;
  }

  async get(id: string): Promise<WorkflowInstance> {
    const instance = this.instanceById.get(id);
    if (!instance) {
      throw new Error(`Workflow instance with id ${id} not found`);
    }
    return instance;
  }
}
