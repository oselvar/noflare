import { WorkflowEntrypoint } from "../workflows";
import { WorkflowStep } from "../workflows";
import { WorkflowEvent } from "../workflows";
import { PauseControl } from "./PauseControl";

export type WorkflowInstanceCreateOptions<Params> = Readonly<{
  id: string;
  params: Params;
}>;

export class WorkflowInstance<
  Entrypoint extends WorkflowEntrypoint<Adapters, Params>,
  Adapters,
  Params,
> {
  constructor(
    private readonly pauseControl: PauseControl,
    private readonly entrypoint: Entrypoint,
    private readonly options: WorkflowInstanceCreateOptions<Params>,
    private readonly step: WorkflowStep
  ) {}

  /**
   * Starts this instance
   * @returns a Promise that resolves when the workflow has completed.
   */
  start() {
    const event: WorkflowEvent<Params> = {
      payload: this.options.params,
      timestamp: new Date(),
      instanceId: this.options.id,
    };
    return this.entrypoint.run(event, this.step);
  }

  async pause() {
    this.pauseControl.pause();
  }

  async resume() {
    this.pauseControl.resume();
  }
}
