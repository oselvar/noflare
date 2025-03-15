export abstract class WorkflowEntrypoint<Adapters, Params> {
  constructor(
    protected readonly adapters: Adapters,
    protected readonly NonRetryableError: NonRetryableErrorConstructor = Error,
  ) {}
  abstract run(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
  ): Promise<unknown>;
}

export type WorkflowEntrypointConstructor<Adapters, Params> = new (
  adapters: Adapters,
  NonRetryableError: NonRetryableErrorConstructor,
) => WorkflowEntrypoint<Adapters, Params>;

export interface NonRetryableErrorConstructor {
  new (message: string, name?: string): Error;
  readonly prototype: Error;
}

export interface WorkflowStep {
  do<T>(
    label: string,
    config: WorkflowStepConfig,
    task: () => Promise<T>,
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
