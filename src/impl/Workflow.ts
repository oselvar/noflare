import {
  NonRetryableErrorConstructor,
  WorkflowEntrypoint,
  WorkflowEntrypointConstructor,
  WorkflowEvent,
} from "../workflows";
import { BaseStep } from "./BaseStep";
import { RetryError, WorkflowTerminatedError } from "./errors";
import { PauseControl } from "./PauseControl";
import { PauseControlStep } from "./PauseControlStep";
import { WorkflowInstance } from "./WorkflowInstance";

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
    wrapStep: (step: BaseStep) => BaseStep = (step) => step,
  ): Promise<WorkflowInstance> {
    const entrypoint = new this.entrypointConstructor(
      adapters,
      this.NonRetryableError,
    );

    const id = options.id || crypto.randomUUID();

    const stepPauseControl = new PauseControl();
    const finishedPauseControl = new PauseControl(false);

    const baseStep = new BaseStep();
    const pauseControlStep = new PauseControlStep(baseStep, stepPauseControl);
    const step = wrapStep(pauseControlStep);
    const instance = new WorkflowInstance(
      id,
      stepPauseControl,
      finishedPauseControl,
      step,
    );
    this.instanceById.set(id, instance);

    const event: WorkflowEvent<Params> = {
      payload: options.params,
      timestamp: new Date(),
      instanceId: id,
    };
    runWorkflow<Adapters, Params>(
      entrypoint,
      event,
      step,
      instance,
      finishedPauseControl,
    );

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

function runWorkflow<Adapters, Params>(
  entrypoint: WorkflowEntrypoint<Adapters, Params>,
  event: WorkflowEvent<Params>,
  step: BaseStep,
  instance: WorkflowInstance,
  finishedPauseControl: PauseControl,
) {
  entrypoint
    .run(event, step)
    .then(() => {
      instance.setStatus({ status: "completed" });
      finishedPauseControl.resume();
    })
    .catch((error) => {
      if (error instanceof WorkflowTerminatedError) {
        instance.setStatus({ status: "terminated", error: error.message });
      } else if (error instanceof RetryError) {
        return runWorkflow(
          entrypoint,
          event,
          step,
          instance,
          finishedPauseControl,
        );
      } else {
        instance.setStatus({ status: "errored", error: error.stack });
      }
      finishedPauseControl.resume();
    });
}
