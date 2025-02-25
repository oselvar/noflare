import { describe, expect, it } from "vitest";

import { ImmediateStep } from "../workflows";
import { MemoryNumberStore } from "./adapters/MemoryNumberStore";
import {
  CalculateCubeAdapters,
  CalculateCubeWorkflow,
} from "./CalculateCubeWorkflow";

describe("CalculateCubeWorkflow", () => {
  it("should calculate the cube of a number", async () => {
    const step = new ImmediateStep();

    const numberStore = new MemoryNumberStore();
    const adapters: CalculateCubeAdapters = {
      numberStore,
    };

    const workflow = new CalculateCubeWorkflow(adapters);
    await workflow.run(
      {
        instanceId: "test",
        timestamp: new Date(),
        payload: { value: 2 },
      },
      step,
    );
    const expected = 8;
    const actual = await numberStore.getNumber("test");
    expect(expected).toBe(actual);
  });
});
