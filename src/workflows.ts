import { PauseControl } from "./PauseControl";

export abstract class WorkflowEntrypoint<Adapters, Params> {
  constructor(
    protected readonly adapters: Adapters,
    protected readonly NonRetryableError: NonRetryableErrorConstructor = Error
  ) {}
  abstract run(
    event: WorkflowEvent<Params>,
    step: WorkflowStep
  ): Promise<unknown>;
}

export type WorkflowEntrypointConstructor<Adapters, Params> = new (
  adapters: Adapters,
  NonRetryableError: NonRetryableErrorConstructor
) => WorkflowEntrypoint<Adapters, Params>;

export interface NonRetryableErrorConstructor {
  new (message: string, name?: string): Error;
  readonly prototype: Error;
}

export interface WorkflowStep {
  do<T>(
    label: string,
    config: WorkflowStepConfig,
    task: () => Promise<T>
  ): Promise<T>;
  do<T>(label: string, task: () => Promise<T>): Promise<T>;
}

export type WorkflowEvent<T> = {
  payload: Readonly<T>;
  timestamp: Date;
  instanceId: string;
};

export type WorkflowStepConfig = {
  retries?: {
    limit: number;
    delay: WorkflowDelayDuration | number;
    backoff?: WorkflowBackoff;
  };
  timeout?: WorkflowTimeoutDuration | number;
};

type WorkflowBackoff = "constant" | "linear" | "exponential";
type WorkflowDurationLabel =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

type WorkflowSleepDuration =
  | `${number} ${WorkflowDurationLabel}${"s" | ""}`
  | number;
type WorkflowDelayDuration = WorkflowSleepDuration;
type WorkflowTimeoutDuration = WorkflowSleepDuration;

export type Task<T> = () => Promise<T>;

/**
 * A step that runs the task.
 */
export class RunTaskStep implements WorkflowStep {
  constructor(private readonly pauseControl: PauseControl) {}

  async do<T>(
    label: string,
    configOrTask: WorkflowStepConfig | Task<T>,
    task?: Task<T>
  ): Promise<T> {
    if (!label) {
      throw new Error("Label is required");
    }
    let _task: Task<T> | undefined;
    if (typeof configOrTask === "function") {
      _task = configOrTask;
    }
    if (typeof task === "function") {
      _task = task;
    }
    if (!_task) {
      throw new Error("No task provided");
    }
    await this.pauseControl.waitIfPaused();
    return _task();
  }
}

export type WorkflowInstanceCreateOptions<Params> = Readonly<{
  id?: string;
  params: Params;
}>;

export class WorkflowInstance<
  Entrypoint extends WorkflowEntrypoint<Adapters, Params>,
  Adapters,
  Params,
> {
  constructor(
    private readonly pauseControl: PauseControl,
    private readonly entrypoint: Entrypoint,
    private readonly options: WorkflowInstanceCreateOptions<Params>,
    private readonly step: WorkflowStep
  ) {}

  /**
   * Starts this instance
   * @returns a Promise that resolves when the workflow has completed.
   */
  start() {
    const event: WorkflowEvent<Params> = {
      payload: this.options.params,
      timestamp: new Date(),
      instanceId: this.options.id || crypto.randomUUID(),
    };
    return this.entrypoint.run(event, this.step);
  }

  async pause() {
    this.pauseControl.pause();
    console.log("Paused workflow instance", this.options.id);
  }

  async resume() {
    this.pauseControl.resume();
    console.log("Resumed workflow instance", this.options.id);
  }
}

export type NewStep = (pauseControl: PauseControl) => WorkflowStep;

export class Workflow<
  Entrypoint extends WorkflowEntrypoint<Adapters, Params>,
  Adapters,
  Params,
> {
  #instanceById: Map<string, WorkflowInstance<Entrypoint, Adapters, Params>> =
    new Map();

  constructor(
    private readonly entrypointConstructor: WorkflowEntrypointConstructor<
      Adapters,
      Params
    >,
    // private readonly adapters: Adapters,
    private readonly NonRetryableError: NonRetryableErrorConstructor = Error
  ) {}

  async create(
    options: WorkflowInstanceCreateOptions<Params>,
    adapters: Adapters,
    newStep: NewStep = (pauseControl) => new RunTaskStep(pauseControl)
  ): Promise<WorkflowInstance<Entrypoint, Adapters, Params>> {
    const entrypoint = new this.entrypointConstructor(
      adapters,
      this.NonRetryableError
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
      step
    ) as WorkflowInstance<Entrypoint, Adapters, Params>;
    this.#instanceById.set(id, instance);
    return instance;
  }

  async get(
    id: string
  ): Promise<WorkflowInstance<Entrypoint, Adapters, Params>> {
    const instance = this.#instanceById.get(id);
    if (!instance) {
      throw new Error(`Workflow instance with id ${id} not found`);
    }
    return instance;
  }
}
