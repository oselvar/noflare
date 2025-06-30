import {
  WorkflowEntrypoint as CloudflareWorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { Workflow } from "../impl/Workflow";
import type { WorkflowEntrypoint } from "../workflows";
import { type WorkflowEntrypointConstructor } from "../workflows";

export type WrapStep<Env, Params extends Rpc.Serializable<Params>> = (
  step: WorkflowStep,
  ctx: ExecutionContext,
  env: Env,
) => WorkflowStep;

export function createCloudflareWorkflow<
  Env,
  Params extends Rpc.Serializable<Params>,
>(
  WorkflowEntrypointConstructor: WorkflowEntrypointConstructor<Env, Params>,
  wrapStep: WrapStep<Env, Params> = (step) => step,
): CloudflareWorkflowEntrypoint<Env, Params> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return class extends CloudflareWorkflowEntrypoint<Env, Params> {
    private readonly workflowEntrypoint: WorkflowEntrypoint<Env, Params>;

    constructor(ctx: ExecutionContext, env: Env) {
      super(ctx, env);
      const workflow = new Workflow(
        WorkflowEntrypointConstructor,
        ctx,
        env,
        NonRetryableError,
      );
      this.workflowEntrypoint = new WorkflowEntrypointConstructor(workflow);
    }

    override async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
      return this.workflowEntrypoint.run(
        event,
        wrapStep(step, this.ctx, this.env),
      );
    }
  };
}
