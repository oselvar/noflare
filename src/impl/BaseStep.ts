import { Task, WorkflowStep, WorkflowStepConfig } from "../workflows";
import { RetryError, WorkflowTerminatedError } from "./errors";

const DEFAULT_RETRY_LIMIT = 3;

export class BaseStep implements WorkflowStep {
  private _workflowTerminated = false;
  private executionCountByLabel = new Map<string, number>();

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

    const executionCount = this.executionCountByLabel.get(label) || 0;
    this.executionCountByLabel.set(label, executionCount + 1);

    try {
      await this.beforeTask(label, _config);
      return await _task();
    } catch (error) {
      const retryLimit = _config?.retries?.limit ?? DEFAULT_RETRY_LIMIT;
      if (executionCount <= retryLimit) {
        throw new RetryError();
      }
      throw error;
    }
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
