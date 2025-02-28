export abstract class WorkflowEntrypoint<Adapters, T = unknown> {
  constructor(
    protected readonly adapters: Adapters,
    protected readonly NonRetryableError: NonRetryableErrorConstructor = Error,
  ) {}
  abstract run(event: WorkflowEvent<T>, step: WorkflowStep): Promise<unknown>;
}

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

export class ImmediateStep implements WorkflowStep {
  do<T>(
    label: string,
    configOrTask: WorkflowStepConfig | Task<T>,
    task?: Task<T>,
  ): Promise<T> {
    if (!label) {
      throw new Error("Label is required");
    }
    if (typeof configOrTask === "function") {
      return configOrTask();
    }
    if (typeof task === "function") {
      return task();
    }

    throw new Error("No task provided");
  }
}
