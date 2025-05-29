import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

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
