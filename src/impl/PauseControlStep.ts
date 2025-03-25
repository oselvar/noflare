import { WorkflowStepConfig } from "cloudflare:workers";

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

  async afterTask(label: string, config?: WorkflowStepConfig) {
    await super.afterTask(label, config);
    await this.pauseControl.waitIfPaused();
  }
}
