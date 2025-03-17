import { BaseStep } from "./BaseStep";
import { DecoratorStep } from "./DecoratorStep";
import { PauseControl } from "./PauseControl";

/**
 * A step that waits for the pause control to be resumed.
 */
export class PauseControlStep extends DecoratorStep {
  constructor(
    step: BaseStep,
    private readonly pauseControl: PauseControl,
  ) {
    super(step);
  }

  async beforeTask() {
    await this.pauseControl.waitIfPaused();
  }
}
