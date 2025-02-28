import { WorkflowEntrypoint as CloudflareWorkflowEntrypoint } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import {
  type NonRetryableErrorConstructor,
  WorkflowEntrypoint as NoflareWorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "../workflows";

export function createCloudflareWorkflow<
  Env,
  T extends Rpc.Serializable<T>,
  Adapters,
>(
  WorkflowImpl: new (
    adapters: Adapters,
    NonRetryableError: NonRetryableErrorConstructor,
  ) => NoflareWorkflowEntrypoint<Adapters, T>,
  makeAdapters: (env: Env) => Adapters,
) {
  return class extends CloudflareWorkflowEntrypoint<Env, T> {
    // Redeclaring the constructor to make ctx and env publi to work around tsup dts generation error:
    //   error TS4094: Property 'ctx' of exported anonymous class type may not be private or protected.
    constructor(
      public readonly ctx: ExecutionContext,
      public readonly env: Env,
    ) {
      super(ctx, env);
    }

    async run(event: WorkflowEvent<T>, step: WorkflowStep) {
      const adapters = makeAdapters(this.env);
      const workflow = new WorkflowImpl(adapters, NonRetryableError);
      await workflow.run(event, step);
    }
  };
}
