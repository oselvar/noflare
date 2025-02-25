import { WorkflowEntrypoint as CloudflareWorkflowEntrypoint } from "cloudflare:workers";

import {
  WorkflowEntrypoint as NoflareWorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "./workflows";

export function createCloudflareWorkflow<
  Env,
  T extends Rpc.Serializable<T>,
  Adapters,
>(
  WorkflowImpl: new (
    adapters: Adapters,
  ) => NoflareWorkflowEntrypoint<Adapters, T>,
  makeAdapters: (env: Env) => Adapters,
) {
  return class extends CloudflareWorkflowEntrypoint<Env, T> {
    async run(event: WorkflowEvent<T>, step: WorkflowStep) {
      const adapters = makeAdapters(this.env);
      const workflow = new WorkflowImpl(adapters);
      await workflow.run(event, step);
    }
  };
}
