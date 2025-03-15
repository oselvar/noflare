import { describe, expect, it } from "vitest";

import {
  NoflareStep,
  runWorkflow,
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "../workflows";
import { MemoryNumberStore } from "./adapters/MemoryNumberStore";
import {
  CalculateCubeAdapters,
  CalculateCubeWorkflow,
} from "./CalculateCubeWorkflow";

type WorkflowInstanceCreateOptions<Params> = {
  id?: string;
  params: Params;
};

class WorkflowInstance<
  Entrypoint extends WorkflowEntrypoint<Adapters, Params>,
  Adapters,
  Params,
> {
  constructor(
    private readonly entrypoint: Entrypoint,
    private readonly options: WorkflowInstanceCreateOptions<Params>,
    private readonly step: WorkflowStep,
  ) {}

  start() {
    const event: WorkflowEvent<Params> = {
      payload: this.options.params,
      timestamp: new Date(),
      instanceId: this.options.id || crypto.randomUUID(),
    };
    return this.entrypoint.run(event, this.step);
  }
}

class Workflow<
  Entrypoint extends WorkflowEntrypoint<Adapters, Params>,
  Adapters,
  Params,
> {
  constructor(
    private readonly entrypointClass: new (adapters: Adapters) => Entrypoint,
    private readonly adapters: Adapters,
  ) {}

  create(
    options: WorkflowInstanceCreateOptions<Params>,
    step: WorkflowStep = new NoflareStep(),
  ): WorkflowInstance<Entrypoint, Adapters, Params> {
    const entrypoint = new this.entrypointClass(this.adapters);
    return new WorkflowInstance(entrypoint, options, step);
  }
}

describe("CalculateCubeWorkflow", () => {
  it("should calculate the cube of a number (new API)", async () => {
    const numberStore = new MemoryNumberStore();
    const adapters: CalculateCubeAdapters = {
      numberStore,
    };
    const workflow = new Workflow(CalculateCubeWorkflow, adapters);
    const instance = workflow.create({
      id: "test",
      params: { value: 2 },
    });

    await instance.start();
    const expected = 8;
    const actual = await numberStore.getNumber("test");
    expect(expected).toBe(actual);
  });

  it("should calculate the cube of a number", async () => {
    const numberStore = new MemoryNumberStore();
    const adapters: CalculateCubeAdapters = {
      numberStore,
    };

    const workflow = new CalculateCubeWorkflow(adapters);
    await runWorkflow(workflow, {
      instanceId: "test",
      timestamp: new Date(),
      payload: { value: 2 },
    });
    const expected = 8;
    const actual = await numberStore.getNumber("test");
    expect(expected).toBe(actual);
  });

  it("should throw a non-retryable error for a negative number", async () => {
    const numberStore = new MemoryNumberStore();
    const adapters: CalculateCubeAdapters = {
      numberStore,
    };

    const workflow = new CalculateCubeWorkflow(adapters);
    await expect(
      runWorkflow(workflow, {
        instanceId: "test",
        timestamp: new Date(),
        payload: { value: -1 },
      }),
    ).rejects.toThrow(
      "Value cannot be negative - this is a non-retryable error",
    );
  });

  it("should run multiple workflows concurrently", async () => {
    const numberStore = new MemoryNumberStore();
    const adapters: CalculateCubeAdapters = {
      numberStore,
    };

    const workflow = new CalculateCubeWorkflow(adapters);

    const values = [1, 2, 3, 4];
    const workflows = values.map((value) => {
      return runWorkflow(workflow, {
        instanceId: `test-${value}`,
        timestamp: new Date(),
        payload: { value },
      });
    });

    await Promise.all(workflows);

    const expected = values.map((value) => value * value * value);
    const actual = await Promise.all(
      values.map((value) => numberStore.getNumber(`test-${value}`)),
    );
    expect(expected).toEqual(actual);
  });
});
