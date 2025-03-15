import { Task } from "../workflows";
import { AbstractStep } from "./AbstractStep";
import { PauseControl } from "./PauseControl";

/**
 * A step that waits for the pause control to be resumed.
 */
export class PauseControlStep extends AbstractStep {
  constructor(
    private readonly step: AbstractStep,
    private readonly pauseControl: PauseControl,
  ) {
    super();
  }

  async runTask<T>(task: Task<T>): Promise<T> {
    await this.pauseControl.waitIfPaused();
    return this.step.runTask(task);
  }
}
