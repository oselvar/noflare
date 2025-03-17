import { BaseStep } from "./BaseStep";
import { PauseControl } from "./PauseControl";

type InstanceStatus = {
  status: "running" | "paused" | "completed" | "errored" | "terminated";
  error?: string;
};

export class TerminatedError extends Error {
  constructor() {
    super("Workflow terminated");
  }
}

export class WorkflowInstance {
  private instanceStatus: InstanceStatus = { status: "running" };

  constructor(
    public readonly id: string,
    private readonly stepPauseControl: PauseControl,
    private readonly finishedPauseControl: PauseControl,
    private readonly step: BaseStep,
  ) {}

  async pause() {
    this.setStatus({ status: "paused" });
    this.stepPauseControl.pause();
  }

  async resume() {
    this.setStatus({ status: "running" });
    this.stepPauseControl.resume();
  }

  async terminate() {
    this.setStatus({ status: "terminated" });
    this.step.workflowTerminated();
    this.stepPauseControl.resume();
  }

  async status(): Promise<InstanceStatus> {
    return this.instanceStatus;
  }

  setStatus(status: InstanceStatus) {
    this.instanceStatus = status;
  }

  /**
   * Waits for the workflow to be done.
   *
   * This method will block until the workflow is in the completed, errored or terminated state.
   */
  async done() {
    // this.setStatus({ status: "completed" });
    await this.finishedPauseControl.waitIfPaused();
  }
}
