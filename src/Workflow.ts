import type { WorkflowEvent } from "cloudflare:workers";

import { PauseControl } from "./impl/PauseControl";
import { WorkflowInstance } from "./impl/WorkflowInstance";
import { TerminatedError, WorkflowStepImpl } from "./impl/WorkflowStepImpl";
import type {
  NonRetryableErrorConstructor,
  WorkflowEntrypointConstructor,
} from "./workflows";

export type WorkflowInstanceCreateOptions<Params> = Readonly<{
  id?: string;
  params: Params;
}>;

export class Workflow<Env, Params> {
  private readonly instanceById = new Map<string, WorkflowInstance>();

  constructor(
    private readonly entrypointConstructor: WorkflowEntrypointConstructor<
      Env,
      Params
    >,
    private readonly ctx: ExecutionContext,
    private readonly env: Env,
    private readonly NonRetryableError: NonRetryableErrorConstructor = Error,
  ) {}

  async create(
    options: WorkflowInstanceCreateOptions<Params>,
  ): Promise<WorkflowInstance> {
    const entrypoint = new this.entrypointConstructor(
      this,
      this.ctx,
      this.env,
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
