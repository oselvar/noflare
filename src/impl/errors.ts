export class WorkflowTerminatedError extends Error {
  constructor() {
    super("Workflow terminated");
  }
}

export class RetryError extends Error {}
