import { Task } from "../workflows";
import { AbstractStep } from "./AbstractStep";

export class TerminatedError extends Error {
  constructor() {
    super("Workflow terminated");
  }
}

export class TerminatableStep extends AbstractStep {
  private terminated = false;

  constructor(private readonly step: AbstractStep) {
    super();
  }

  async runTask<T>(task: Task<T>): Promise<T> {
    if (this.terminated) {
      throw new TerminatedError();
    }
    return this.step.runTask(task);
  }

  terminate() {
    this.terminated = true;
  }
}
