import { WorkflowEntrypoint as CloudflareWorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import {
  // type NonRetryableErrorConstructor,
  WorkflowEntrypoint as NoflareWorkflowEntrypoint,
  WorkflowEntrypointConstructor,
  type WorkflowEvent,
  type WorkflowStep,
} from "../workflows";

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
) {
  return class extends CloudflareWorkflowEntrypoint<Env, Params> {
    private readonly workflowEntrypoint: NoflareWorkflowEntrypoint<
      Adapters,
      Params
    >;
    private readonly adapters: Adapters;
    // Redeclaring the constructor to make ctx and env public to work around tsup dts generation error:
    //   error TS4094: Property 'ctx' of exported anonymous class type may not be private or protected.
    constructor(
      public readonly ctx: ExecutionContext,
      public readonly env: Env,
    ) {
      super(ctx, env);
      this.adapters = makeAdapters(ctx, env);
      this.workflowEntrypoint = new WorkflowEntrypointConstructor(
        this.adapters,
        NonRetryableError,
      );
    }

    async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
      return this.workflowEntrypoint.run(event, wrapStep(step, this.adapters));
    }
  };
}
