export class PauseControl {
  private isRunning: boolean = true;
  private resumePromise: Promise<void> = Promise.resolve();
  private resumeResolver: (() => void) | null = null;

  constructor(initiallyRunning: boolean = true) {
    this.isRunning = initiallyRunning;
    if (!initiallyRunning) {
      this.createResumePromise();
    }
  }

  // Wait if paused
  public async waitIfPaused(): Promise<void> {
    if (!this.isRunning) {
      await this.resumePromise;
    }
  }

  // Is the system currently running?
  public isActive(): boolean {
    return this.isRunning;
  }

  // Pause execution
  public pause(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.createResumePromise();
    }
  }

  // Resume execution
  public resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      if (this.resumeResolver) {
        this.resumeResolver();
        this.resumeResolver = null;
      }
    }
  }

  private createResumePromise(): void {
    this.resumePromise = new Promise<void>((resolve) => {
      this.resumeResolver = resolve;
    });
  }
}
