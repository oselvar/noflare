import { Task } from "../workflows";
import { AbstractStep } from "./AbstractStep";

export class RunTaskStep extends AbstractStep {
  async runTask<T>(task: Task<T>): Promise<T> {
    return task();
  }
}
