import { PauseControl } from "./PauseControl";
import { ThrowFirstTimeStep } from "./ThrowFirstTimeStep";

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
    private readonly step: ThrowFirstTimeStep,
  ) {}

  async pause() {
    this.setStatus({ status: "paused" });
    this.stepPauseControl.pause();
  }

  async resume() {
    this.stepPauseControl.resume();
    this.setStatus({ status: "running" });
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
    await this.finishedPauseControl.waitIfPaused();
  }
}
