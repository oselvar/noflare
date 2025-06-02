import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { Workflow } from "../impl/Workflow";
import { WorkflowEntrypoint } from "../workflows"; // Was: cloudflare:workers
import type { NumberStore } from "./adapters/NumberStore";

export type CalculateCubeParams = {
  value: number;
};

export type CalculateCubeAdapters = {
  numberStore: NumberStore;
  workflow: Workflow<CalculateCubeAdapters, CalculateCubeParams>;
};

export class CalculateCubeEntrypoint extends WorkflowEntrypoint<
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

    if (params.value === 42) {
      await step.do("pause this workflow", async () => {
        const instance = await this.adapters.workflow.get(event.instanceId);
        await instance.pause();
      });
    }

    if (params.value === 43) {
      const weather = await step.waitForEvent<number>(
        "Wait for the sun to shine",
        {
          type: "weather",
          timeout: "10 seconds",
        },
      );
      if (weather.payload !== 143) {
        throw new Error("Weather is not 143");
      }
    }

    const cube = await step.do("calculate cube", async () => {
      return square * params.value;
    });

    await step.do("store cube", async () => {
      await this.adapters.numberStore.putNumber(event.instanceId, cube);
    });
  }
}
