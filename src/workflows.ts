import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import type { Workflow } from "./impl/Workflow";

export abstract class WorkflowEntrypoint<Env, Params> {
  constructor(protected readonly workflow: Workflow<Env, Params>) {}

  abstract run(
    event: WorkflowEvent<Params>,
    step: WorkflowStep,
  ): Promise<unknown>;
}

export type WorkflowEntrypointConstructor<Env, Params> = new (
  workflow: Workflow<Env, Params>,
) => WorkflowEntrypoint<Env, Params>;

export interface NonRetryableErrorConstructor {
  new (message: string, name?: string): Error;
  readonly prototype: Error;
}
