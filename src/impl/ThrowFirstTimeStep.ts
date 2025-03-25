import { WorkflowStepConfig } from "cloudflare:workers";

import { DecoratorStep } from "./DecoratorStep";

/**
 * A step that throws an error the first time it is executed.
 * This is useful for testing idempotency of steps.
 */
export class ThrowFirstTimeStep extends DecoratorStep {
  private readonly seenLabels = new Set<string>();

  override async afterTask(label: string, config?: WorkflowStepConfig) {
    await super.afterTask(label, config);
    const seenBefore = this.seenLabels.has(label);
    this.seenLabels.add(label);
    if (label.includes("pause")) {
      return;
    }
    if (!seenBefore) {
      throw new Error(
        `First time seeing step label "${label}". Simulate error.`,
      );
    }
  }
}
