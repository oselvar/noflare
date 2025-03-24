import { Task, WorkflowStep, WorkflowStepConfig } from "../workflows";
import { TerminatedError as WorkflowTerminatedError } from "./WorkflowInstance";

export class BaseStep implements WorkflowStep {
  private _workflowTerminated = false;

  async do<T>(
    label: string,
    configOrTask: WorkflowStepConfig | Task<T>,
    task?: Task<T>,
  ): Promise<T> {
    if (!label) {
      throw new Error("Label is required");
    }
    let _task: Task<T> | undefined;
    let _config: WorkflowStepConfig | undefined;
    if (typeof configOrTask === "function") {
      _task = configOrTask;
    }
    if (typeof task === "function") {
      _task = task;
      _config = configOrTask as WorkflowStepConfig;
    }
    if (!_task) {
      throw new Error("No task provided");
    }
    if (this._workflowTerminated) {
      throw new WorkflowTerminatedError();
    }

    await this.beforeTask(label, _config);
    return _task();
  }

  workflowTerminated() {
    this._workflowTerminated = true;
  }

  public beforeTask(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _label: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config?: WorkflowStepConfig,
  ): Promise<void> {
    return Promise.resolve();
  }
}
