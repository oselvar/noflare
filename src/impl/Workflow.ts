import {
  NonRetryableErrorConstructor,
  WorkflowEntrypoint,
  WorkflowEntrypointConstructor,
} from "../workflows";
import { WorkflowStep } from "../workflows";
import { PauseControl } from "./PauseControl";
import { RunTaskStep } from "./RunTaskStep";
import {
  WorkflowInstance,
  WorkflowInstanceCreateOptions,
} from "./WorkflowInstance";

export type NewStep = (pauseControl: PauseControl) => WorkflowStep;

export class Workflow<
  Entrypoint extends WorkflowEntrypoint<Adapters, Params>,
  Adapters,
  Params,
> {
  private readonly instanceById: Map<
    string,
    WorkflowInstance<Entrypoint, Adapters, Params>
  > = new Map();

  constructor(
    private readonly entrypointConstructor: WorkflowEntrypointConstructor<
      Adapters,
      Params
    >,
    // private readonly adapters: Adapters,
    private readonly NonRetryableError: NonRetryableErrorConstructor = Error,
  ) {}

  async create(
    options: WorkflowInstanceCreateOptions<Params>,
    adapters: Adapters,
    newStep: NewStep = (pauseControl) => new RunTaskStep(pauseControl),
  ): Promise<WorkflowInstance<Entrypoint, Adapters, Params>> {
    const entrypoint = new this.entrypointConstructor(
      adapters,
      this.NonRetryableError,
    );

    const optionsWithId: WorkflowInstanceCreateOptions<Params> = {
      ...options,
      id: options.id || crypto.randomUUID(),
    };
    const id = optionsWithId.id!;

    const pauseControl = new PauseControl();
    const step = newStep(pauseControl);

    const instance = new WorkflowInstance<typeof entrypoint, Adapters, Params>(
      pauseControl,
      entrypoint,
      optionsWithId,
      step,
    ) as WorkflowInstance<Entrypoint, Adapters, Params>;
    this.instanceById.set(id, instance);
    return instance;
  }

  async get(
    id: string,
  ): Promise<WorkflowInstance<Entrypoint, Adapters, Params>> {
    const instance = this.instanceById.get(id);
    if (!instance) {
      throw new Error(`Workflow instance with id ${id} not found`);
    }
    return instance;
  }
}
