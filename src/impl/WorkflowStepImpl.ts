import type {
  WorkflowSleepDuration,
  WorkflowStep,
  WorkflowStepConfig,
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

type Task<T> = () => Promise<T>;

export class WorkflowStepImpl implements WorkflowStep {
  private terminated = false;
  private eventPauseControls: Map<string, PauseControl> = new Map();
  private eventData: Map<string, unknown> = new Map();
  private timeoutEvents: Set<string> = new Set();

  constructor(private readonly pauseControl: PauseControl) {}

  async do<T>(
    label: string,
    configOrTask: WorkflowStepConfig | Task<T>,
    task?: Task<T>,
  ): Promise<T> {
    if (!label) {
      throw new Error("Label is required");
    }
    let _task: Task<T> | undefined;
    if (typeof configOrTask === "function") {
      _task = configOrTask;
    }
    if (typeof task === "function") {
      _task = task;
    }
    if (!_task) {
      throw new Error("No task provided");
    }
    return this.runTask(_task);
  }

  async runTask<T>(task: Task<T>): Promise<T> {
    if (this.terminated) {
      throw new TerminatedError();
    }
    await this.pauseControl.waitIfPaused();
    return task();
  }

  sleep(name: string, duration: WorkflowSleepDuration): Promise<void> {
    console.log(name, duration);
    throw new Error("Not implemented");
  }

  sleepUntil(name: string, timestamp: Date | number): Promise<void> {
    console.log(name, timestamp);
    throw new Error("Not implemented");
  }

  async waitForEvent<T extends Rpc.Serializable<T>>(
    _name: string,
    options: {
      type: string;
      timeout?: WorkflowTimeoutDuration | number;
    },
  ): Promise<WorkflowStepEvent<T>> {
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
