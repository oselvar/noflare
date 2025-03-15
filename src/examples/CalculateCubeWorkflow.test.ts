import { beforeEach, describe, expect, it } from "vitest";

import { Workflow } from "../workflows";
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

  it("should pause", async () => {
    const instance = await workflow.create(
      {
        id: "test",
        params: { value: 42 },
      },
      adapters
    );

    const instancePromise = instance.start();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await instance.resume();
    await instancePromise;
    const expected = 74088;
    const actual = await numberStore.getNumber("test");
    expect(actual).toBe(expected);
  });

  // it("should calculate the cube of a number", async () => {
  //   await runWorkflow(workflow, {
  //     instanceId: "test",
  //     timestamp: new Date(),
  //     payload: { value: 2 },
  //   });
  //   const expected = 8;
  //   const actual = await numberStore.getNumber("test");
  //   expect(expected).toBe(actual);
  // });

  // it("should throw a non-retryable error for a negative number", async () => {
  //   const numberStore = new MemoryNumberStore();
  //   const adapters: CalculateCubeAdapters = {
  //     numberStore,
  //   };

  //   const workflow = new CalculateCubeEntrypoint(adapters);
  //   await expect(
  //     runWorkflow(workflow, {
  //       instanceId: "test",
  //       timestamp: new Date(),
  //       payload: { value: -1 },
  //     })
  //   ).rejects.toThrow(
  //     "Value cannot be negative - this is a non-retryable error"
  //   );
  // });

  // it("should run multiple workflows concurrently", async () => {
  //   const numberStore = new MemoryNumberStore();
  //   const adapters: CalculateCubeAdapters = {
  //     numberStore,
  //   };

  //   const workflow = new CalculateCubeEntrypoint(adapters);

  //   const values = [1, 2, 3, 4];
  //   const workflows = values.map((value) => {
  //     return runWorkflow(workflow, {
  //       instanceId: `test-${value}`,
  //       timestamp: new Date(),
  //       payload: { value },
  //     });
  //   });

  //   await Promise.all(workflows);

  //   const expected = values.map((value) => value * value * value);
  //   const actual = await Promise.all(
  //     values.map((value) => numberStore.getNumber(`test-${value}`))
  //   );
  //   expect(expected).toEqual(actual);
  // });
});
