import { WorkflowStepConfig } from "../workflows";
import { BaseStep } from "./BaseStep";

export class DecoratorStep extends BaseStep {
  constructor(private readonly step: BaseStep) {
    super();
  }

  override async beforeTask(
    label: string,
    config?: WorkflowStepConfig,
  ): Promise<void> {
    return this.step.beforeTask(label, config);
  }

  override workflowTerminated() {
    return this.step.workflowTerminated();
  }
}
