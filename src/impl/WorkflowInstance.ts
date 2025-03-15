import { PauseControl } from "./PauseControl";
import { TerminatableStep } from "./TerminatableStep";

type InstanceStatus = {
  status: "running" | "paused" | "completed" | "errored" | "terminated";
  error?: string;
};

export class WorkflowInstance {
  private instanceStatus: InstanceStatus = { status: "running" };

  constructor(
    public readonly id: string,
    private readonly stepPauseControl: PauseControl,
    private readonly finishedPauseControl: PauseControl,
    private readonly terminatableStep: TerminatableStep,
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
    this.terminatableStep.terminate();
    this.stepPauseControl.resume();
  }

  async status(): Promise<InstanceStatus> {
    return this.instanceStatus;
  }

  setStatus(status: InstanceStatus) {
    this.instanceStatus = status;
  }

  /**
   * Waits for the workflow to finish.
   *
   * This method will block until the workflow has either completed or terminated.
   */
  async waitFor() {
    this.setStatus({ status: "completed" });
    await this.finishedPauseControl.waitIfPaused();
  }
}
