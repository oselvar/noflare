import {
  Task,
  WorkflowStep,
  WorkflowStepConfig,
  WorkflowStepEvent,
  WorkflowTimeoutDuration,
} from "../workflows";
import { PauseControl } from "./PauseControl";

export class TerminatedError extends Error {
  constructor() {
    super("Workflow terminated");
  }
}

export class WorkflowStepImpl implements WorkflowStep {
  private terminated = false;

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

  waitForEvent<T extends Rpc.Serializable<T>>(
    name: string,
    options: {
      type: string;
      timeout?: WorkflowTimeoutDuration | number;
    },
  ): Promise<WorkflowStepEvent<T>> {
    console.log(name, options);
    throw new Error("Not implemented");
  }

  terminate() {
    this.terminated = true;
  }
}
