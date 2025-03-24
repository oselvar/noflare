import { WorkflowStepConfig } from "../workflows";
import { BaseStep } from "./BaseStep";

export class DecoratorStep extends BaseStep {
  constructor(private readonly step: BaseStep) {
    super();
  }

  override beforeTask(label: string, config?: WorkflowStepConfig) {
    return this.step.beforeTask(label, config);
  }

  override afterTask(label: string, config?: WorkflowStepConfig) {
    return this.step.afterTask(label, config);
  }

  override workflowTerminated() {
    return this.step.workflowTerminated();
  }
}
