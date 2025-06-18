import {
  WorkflowEntrypoint as CloudflareWorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import type { WorkflowEntrypoint } from "../workflows";
import { type WorkflowEntrypointConstructor } from "../workflows";

export function createCloudflareWorkflow<
  Env,
  Params extends Rpc.Serializable<Params>,
  Adapters,
>(
  WorkflowEntrypointConstructor: WorkflowEntrypointConstructor<
    Adapters,
    Params
  >,
  makeAdapters: (ctx: ExecutionContext, env: Env) => Adapters,
  wrapStep: (step: WorkflowStep, adapters: Adapters) => WorkflowStep = (step) =>
    step,
): CloudflareWorkflowEntrypoint<Env, Params> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return class extends CloudflareWorkflowEntrypoint<Env, Params> {
    private readonly workflowEntrypoint: WorkflowEntrypoint<Adapters, Params>;
    private readonly adapters: Adapters;

    constructor(ctx: ExecutionContext, env: Env) {
      super(ctx, env);
      this.adapters = makeAdapters(ctx, env);
      this.workflowEntrypoint = new WorkflowEntrypointConstructor(
        this.adapters,
        NonRetryableError,
      );
    }

    override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
      return this.workflowEntrypoint.run(event, wrapStep(step, this.adapters));
    }
  };
}
