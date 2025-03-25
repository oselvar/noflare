import { Task, WorkflowStep, WorkflowStepConfig } from "../workflows";
import { WorkflowTerminatedError } from "./errors";

const DEFAULT_RETRY_LIMIT = 3;

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

    const retryLimit = _config?.retries?.limit ?? DEFAULT_RETRY_LIMIT;

    let lastError: Error | undefined;
    for (let i = 0; i < retryLimit; i++) {
      try {
        await this.beforeTask(label, _config);
        const result = await _task();
        await this.afterTask(label, _config);
        return result;
      } catch (error) {
        lastError = error as Error;
      }
    }
    throw lastError;
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

  public afterTask(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _label: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _config?: WorkflowStepConfig,
  ): Promise<void> {
    return Promise.resolve();
  }
}
