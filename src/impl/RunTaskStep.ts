import { Task, WorkflowStep, WorkflowStepConfig } from "../workflows";
import { PauseControl } from "./PauseControl";

/**
 * A step that runs the task.
 */
export class RunTaskStep implements WorkflowStep {
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
    await this.pauseControl.waitIfPaused();
    return _task();
  }
}
