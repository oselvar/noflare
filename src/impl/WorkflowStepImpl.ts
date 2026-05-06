import type {
  StepPromise,
  WorkflowSleepDuration,
  WorkflowStep,
  WorkflowStepConfig,
  WorkflowStepContext,
  WorkflowStepEvent,
  WorkflowTimeoutDuration,
} from "cloudflare:workers";

import { PauseControl } from "./PauseControl";

export class TerminatedError extends Error {
  constructor() {
    super("Workflow terminated");
  }
}

export class TimeoutError extends Error {
  constructor(eventType: string, timeout: number | WorkflowTimeoutDuration) {
    super(`Timeout waiting for event '${eventType}' after ${timeout}`);
  }
}

type StepCallback<T> = (ctx: WorkflowStepContext) => Promise<T>;

function toStepPromise<T>(promise: Promise<T>): StepPromise<T> {
  const stepPromise = promise as StepPromise<T>;
  stepPromise.rollback = (() => stepPromise) as StepPromise<T>["rollback"];
  return stepPromise;
}

function makeStepContext(name: string, config: WorkflowStepConfig = {}): WorkflowStepContext {
  return {
    step: { name, count: 0 },
    attempt: 1,
    config,
  };
}

export class WorkflowStepImpl implements WorkflowStep {
  private terminated = false;
  private eventPauseControls: Map<string, PauseControl> = new Map();
  private eventData: Map<string, unknown> = new Map();
  private timeoutEvents: Set<string> = new Set();

  constructor(private readonly pauseControl: PauseControl) {}

  do<T extends Rpc.Serializable<T>>(name: string, callback: StepCallback<T>): StepPromise<T>;
  do<T extends Rpc.Serializable<T>>(
    name: string,
    config: WorkflowStepConfig,
    callback: StepCallback<T>,
  ): StepPromise<T>;
  do<T extends Rpc.Serializable<T>>(
    name: string,
    configOrCallback: WorkflowStepConfig | StepCallback<T>,
    callback?: StepCallback<T>,
  ): StepPromise<T> {
    if (!name) {
      throw new Error("Name is required");
    }
    const cb = typeof configOrCallback === "function" ? configOrCallback : callback;
    const config = typeof configOrCallback === "function" ? undefined : configOrCallback;
    if (!cb) {
      throw new Error("No callback provided");
    }
    return toStepPromise(this.runTask(name, config, cb));
  }

  private async runTask<T>(
    name: string,
    config: WorkflowStepConfig | undefined,
    callback: StepCallback<T>,
  ): Promise<T> {
    if (this.terminated) {
      throw new TerminatedError();
    }
    await this.pauseControl.waitIfPaused();
    return callback(makeStepContext(name, config));
  }

  sleep = async (_name: string, _duration: WorkflowSleepDuration): Promise<void> => {
    // no-op
  };

  sleepUntil = async (_name: string, _timestamp: Date | number): Promise<void> => {
    // no-op
  };

  waitForEvent<T extends Rpc.Serializable<T>>(
    _name: string,
    options: {
      type: string;
      timeout?: WorkflowTimeoutDuration | number;
    },
  ): StepPromise<WorkflowStepEvent<T>> {
    return toStepPromise(this.awaitEvent<T>(options));
  }

  private async awaitEvent<T>(options: {
    type: string;
    timeout?: WorkflowTimeoutDuration | number;
  }): Promise<WorkflowStepEvent<T>> {
    if (this.timeoutEvents.has(options.type)) {
      throw new TimeoutError(options.type, options.timeout || 0);
    }

    let pauseControl = this.eventPauseControls.get(options.type);
    if (!pauseControl) {
      pauseControl = new PauseControl();
      this.eventPauseControls.set(options.type, pauseControl);
    }
    pauseControl.pause();
    await pauseControl.waitIfPaused();

    if (this.timeoutEvents.has(options.type)) {
      throw new TimeoutError(options.type, options.timeout || 0);
    }

    const payload = this.eventData.get(options.type);
    if (!payload) {
      throw new Error(`No payload for event type ${options.type}`);
    }
    return {
      type: options.type,
      payload: payload as T,
      timestamp: new Date(),
    };
  }

  async sendEvent(params: { type: string; payload: unknown }): Promise<void> {
    const pauseControl = this.eventPauseControls.get(params.type);
    if (!pauseControl) {
      throw new Error(`No pause control for event type ${params.type}`);
    }
    this.eventData.set(params.type, params.payload);
    pauseControl.resume();
  }

  terminate() {
    this.terminated = true;
  }

  triggerTimeout(eventType: string): void {
    this.timeoutEvents.add(eventType);
    const pauseControl = this.eventPauseControls.get(eventType);
    if (pauseControl) {
      pauseControl.resume();
    }
  }
}
