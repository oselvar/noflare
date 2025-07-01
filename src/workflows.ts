import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import type { Workflow } from "./Workflow";

export abstract class WorkflowEntrypoint<Env, Params> {
  constructor(
    protected readonly workflow: Workflow<Env, Params>,
    protected readonly ctx: ExecutionContext,
    protected readonly env: Env,
    protected readonly NonRetryableError: NonRetryableErrorConstructor,
  ) {}

  abstract run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<unknown>;
}

export type WorkflowEntrypointConstructor<Env, Params> = new (
  workflow: Workflow<Env, Params>,
  ctx: ExecutionContext,
  env: Env,
  NonRetryableError: NonRetryableErrorConstructor,
) => WorkflowEntrypoint<Env, Params>;

export interface NonRetryableErrorConstructor {
  new (message: string, name?: string): Error;
  readonly prototype: Error;
}
