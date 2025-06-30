import { beforeEach, describe, expect, it } from "vitest";

import { Workflow } from "../impl";
import { MemoryNumberStore } from "./adapters/MemoryNumberStore";
import {
  CalculateCubeEntrypoint,
  type CalculateCubeParams,
} from "./CalculateCubeWorkflow";
import type { TestEnv } from "./TestEnv";

describe("CalculateCubeWorkflow", () => {
  let numberStore: MemoryNumberStore;
  let workflow: Workflow<Env | TestEnv, CalculateCubeParams>;

  beforeEach(() => {
    numberStore = new MemoryNumberStore();
    const env: TestEnv = {
      type: "test",
      TEST_NUMBER_STORE: numberStore,
    };
    const ctx: ExecutionContext = {
      waitUntil: () => {},
      passThroughOnException: () => {},
      props: {},
      exports: {},
      abort: () => {},
    };
    workflow = new Workflow(CalculateCubeEntrypoint, ctx, env);
  });

  it("should pause and resume a workflow", async () => {
    const instance = await workflow.create({ params: { value: 42 } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await instance.resume();
    await instance.done();
    expect(await instance.status()).toEqual({ status: "completed" });
    const actual = await numberStore.getNumber(instance.id);
    expect(actual).toBe(74088);
  });

  it("should wait for event and resume when it happens", async () => {
    const instance = await workflow.create({ params: { value: 43 } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await instance.sendEvent({ type: "weather", payload: 143 });
    await instance.done();
    expect(await instance.status()).toEqual({ status: "completed" });
    const actual = await numberStore.getNumber(instance.id);
    expect(actual).toBe(79507);
  });

  it("should terminate a workflow", async () => {
    const instance = await workflow.create({ params: { value: 42 } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await instance.terminate();
    await instance.done();
    expect(await instance.status()).toEqual({
      status: "terminated",
      error: "Workflow terminated",
    });
    const number = await numberStore.getNumber(instance.id);
    expect(number).toBeUndefined();
  });

  it("should calculate the cube of a number", async () => {
    const instance = await workflow.create({ params: { value: 2 } });
    await instance.done();
    expect(await instance.status()).toEqual({ status: "completed" });
    const actual = await numberStore.getNumber(instance.id);
    expect(actual).toEqual(8);
  });

  it("should throw a non-retryable error for a negative number", async () => {
    const instance = await workflow.create({ params: { value: -1 } });
    await instance.done();
    const status = await instance.status();
    expect(status.status).toEqual("errored");
    expect(status.error).toMatch(
      /Value cannot be negative - this is a non-retryable error/,
    );
  });

  it("should throw a retryable error for zero", async () => {
    const instance = await workflow.create({ params: { value: 0 } });
    await instance.done();
    const status = await instance.status();
    expect(status.status).toEqual("errored");
    expect(status.error).toMatch(
      /Value cannot be 0 - this is a retryable error/,
    );
  });

  it("should run multiple workflows concurrently", async () => {
    const values = [1, 2, 3, 4];
    const workflows = values.map(async (value) => {
      const instance = await workflow.create({
        id: `test-${value}`,
        params: { value },
      });
      await instance.done();
    });

    await Promise.all(workflows);

    const expected = values.map((value) => value * value * value);
    const actual = await Promise.all(
      values.map((value) => numberStore.getNumber(`test-${value}`)),
    );
    expect(actual).toEqual(expected);
  });

  it("should timeout when timeout is triggered after run", async () => {
    const instance = await workflow.create({ params: { value: 43 } });

    await new Promise((resolve) => setTimeout(resolve, 0));
    instance.triggerTimeout("weather");

    await instance.done();
    const status = await instance.status();
    expect(status.status).toEqual("errored");
    expect(status.error).toMatch(
      /Timeout waiting for event 'weather' after 10 seconds/,
    );
  });

  it("should timeout when timeout is triggered before run", async () => {
    const instance = await workflow.create({ params: { value: 43 } });
    instance.triggerTimeout("weather");
    await new Promise((resolve) => setTimeout(resolve, 0));

    await instance.done();
    const status = await instance.status();
    expect(status.status).toEqual("errored");
    expect(status.error).toMatch(
      /Timeout waiting for event 'weather' after 10 seconds/,
    );
  });
});
