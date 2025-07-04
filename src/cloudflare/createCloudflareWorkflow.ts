import {
  WorkflowEntrypoint as CloudflareWorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import type { WorkflowEntrypoint } from "../workflows";
import { type WorkflowEntrypointConstructor } from "../workflows";

export type WrapStep<Env> = (
  step: WorkflowStep,
  instanceId: string,
  ctx: ExecutionContext,
  env: Env,
) => WorkflowStep;

export function createCloudflareWorkflow<Env, Params extends Rpc.Serializable<Params>>(
  WorkflowEntrypointConstructor: WorkflowEntrypointConstructor<Env, Params>,
  wrapStep: WrapStep<Env> = (step) => step,
): CloudflareWorkflowEntrypoint<Env, Params> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return class extends CloudflareWorkflowEntrypoint<Env, Params> {
    private readonly workflowEntrypoint: WorkflowEntrypoint<Env, Params>;

    constructor(ctx: ExecutionContext, env: Env) {
      super(ctx, env);
      this.workflowEntrypoint = new WorkflowEntrypointConstructor(ctx, env, NonRetryableError);
    }

    override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
      return this.workflowEntrypoint.run(
        event,
        wrapStep(step, event.instanceId, this.ctx, this.env),
      );
    }
  };
}
