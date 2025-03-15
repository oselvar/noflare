import { beforeEach, describe, expect, it } from "vitest";

import { Workflow } from "../impl";
import { MemoryNumberStore } from "./adapters/MemoryNumberStore";
import {
  CalculateCubeAdapters,
  CalculateCubeEntrypoint,
  CalculateCubeParams,
} from "./CalculateCubeWorkflow";

describe("CalculateCubeWorkflow", () => {
  let numberStore: MemoryNumberStore;
  let workflow: Workflow<
    CalculateCubeEntrypoint,
    CalculateCubeAdapters,
    CalculateCubeParams
  >;
  let adapters: CalculateCubeAdapters;

  beforeEach(() => {
    numberStore = new MemoryNumberStore();
    workflow = new Workflow(CalculateCubeEntrypoint);
    adapters = {
      numberStore,
      workflow,
    };
  });

  it("should pause and resume a workflow", async () => {
    const instance = await workflow.create(
      {
        id: "test",
        params: { value: 42 },
      },
      adapters
    );

    const instancePromise = instance.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await instance.resume();
    await instancePromise;
    const expected = 74088;
    const actual = await numberStore.getNumber("test");
    expect(actual).toBe(expected);
  });

  it("should calculate the cube of a number", async () => {
    const instance = await workflow.create(
      {
        id: "test",
        params: { value: 2 },
      },
      adapters
    );
    await instance.start();

    const expected = 8;
    const actual = await numberStore.getNumber("test");
    expect(actual).toEqual(expected);
  });

  it("should throw a non-retryable error for a negative number", async () => {
    const instance = await workflow.create(
      {
        id: "test",
        params: { value: -1 },
      },
      adapters
    );
    await expect(instance.start()).rejects.toThrow(
      "Value cannot be negative - this is a non-retryable error"
    );
  });

  it("should run multiple workflows concurrently", async () => {
    const values = [1, 2, 3, 4];
    const workflows = values.map(async (value) => {
      const instance = await workflow.create(
        {
          id: `test-${value}`,
          params: { value },
        },
        adapters
      );
      await instance.start();
    });

    await Promise.all(workflows);

    const expected = values.map((value) => value * value * value);
    const actual = await Promise.all(
      values.map((value) => numberStore.getNumber(`test-${value}`))
    );
    expect(actual).toEqual(expected);
  });
});
