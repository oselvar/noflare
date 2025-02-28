import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "../workflows"; // Was: cloudflare:workers
import { NumberStore } from "./adapters/NumberStore";

/**
 * The parameters for the workflow.
 */
export type CalculateCubeParams = {
  value: number;
};

/**
 * The adapters for the workflow.
 */
export type CalculateCubeAdapters = {
  numberStore: NumberStore;
};

export class CalculateCubeWorkflow extends WorkflowEntrypoint<
  CalculateCubeAdapters,
  CalculateCubeParams
> {
  async run(event: WorkflowEvent<CalculateCubeParams>, step: WorkflowStep) {
    const params = event.payload;

    const square = await step.do(
      "calculate square",
      {
        retries: {
          limit: 3,
          delay: "1 second",
        },
      },
      async () => {
        console.log("calculate square", params.value);
        if (params.value === 0) {
          throw new Error("Value cannot be 0 - this is a retryable error");
        }
        if (params.value < 0) {
          throw new this.NonRetryableError(
            "Value cannot be negative - this is a non-retryable error",
            "the-name",
          );
        }
        return params.value * params.value;
      },
    );

    const cube = await step.do("calculate cube", async () => {
      return square * params.value;
    });

    await step.do("store cube", async () => {
      await this.adapters.numberStore.putNumber(event.instanceId, cube);
    });
  }
}
