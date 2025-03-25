export class WorkflowTerminatedError extends Error {
  constructor() {
    super("Workflow terminated");
  }
}
