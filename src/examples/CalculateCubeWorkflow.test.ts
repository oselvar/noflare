import { beforeEach, describe, expect, it } from "vitest";

import { ThrowFirstTimeStep, Workflow } from "../impl";
import { MemoryNumberStore } from "./adapters/MemoryNumberStore";
import {
  CalculateCubeAdapters,
  CalculateCubeEntrypoint,
  CalculateCubeParams,
} from "./CalculateCubeWorkflow";

describe("CalculateCubeWorkflow", () => {
  let numberStore: MemoryNumberStore;
  let workflow: Workflow<CalculateCubeAdapters, CalculateCubeParams>;
  let adapters: CalculateCubeAdapters;

  beforeEach(() => {
    numberStore = new MemoryNumberStore();
    workflow = new Workflow(CalculateCubeEntrypoint);
    adapters = {
      numberStore,
      workflow,
    };
  });

  it("should simulate a workflow with flaky steps", async () => {
    const instance = await workflow.create(
      { params: { value: 2 } },
      adapters,
      (step) => new ThrowFirstTimeStep(step),
    );
    await instance.done();
    expect(await instance.status()).toEqual({
      status: "completed",
    });
  });

  it("should pause and resume a workflow", async () => {
    const instance = await workflow.create({ params: { value: 42 } }, adapters);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await instance.resume();
    await instance.done();
    expect(await instance.status()).toEqual({ status: "completed" });
    const actual = await numberStore.getNumber(instance.id);
    expect(actual).toBe(74088);
  });

  it("should terminate a workflow", async () => {
    const instance = await workflow.create({ params: { value: 42 } }, adapters);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await instance.status()).toEqual({
      status: "paused",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await instance.terminate();
    expect(await instance.status()).toEqual({
      status: "terminated",
    });
    const number = await numberStore.getNumber(instance.id);
    expect(number).toBeUndefined();
  });

  it("should calculate the cube of a number", async () => {
    const instance = await workflow.create({ params: { value: 2 } }, adapters);
    await instance.done();
    expect(await instance.status()).toEqual({ status: "completed" });
    const actual = await numberStore.getNumber(instance.id);
    expect(actual).toEqual(8);
  });

  it("should throw a non-retryable error for a negative number", async () => {
    const instance = await workflow.create({ params: { value: -1 } }, adapters);
    await instance.done();
    const status = await instance.status();
    expect(status.status).toEqual("errored");
    expect(status.error).toMatch(
      /Error: Value cannot be negative - this is a non-retryable error/,
    );
  });

  it("should throw a retryable error for zero", async () => {
    const instance = await workflow.create({ params: { value: 0 } }, adapters);
    await instance.done();
    const status = await instance.status();
    expect(status.status).toEqual("errored");
    expect(status.error).toMatch(
      /Error: Value cannot be 0 - this is a retryable error/,
    );
  });

  it("should run multiple workflows concurrently", async () => {
    const values = [1, 2, 3, 4];
    const workflows = values.map(async (value) => {
      const instance = await workflow.create(
        { id: `test-${value}`, params: { value } },
        adapters,
      );
      await instance.done();
    });

    await Promise.all(workflows);

    const expected = values.map((value) => value * value * value);
    const actual = await Promise.all(
      values.map((value) => numberStore.getNumber(`test-${value}`)),
    );
    expect(actual).toEqual(expected);
  });
});
