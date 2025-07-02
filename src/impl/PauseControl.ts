export class PauseControl {
  private isPaused: boolean = false;
  private resumePromise: Promise<void> = Promise.resolve();
  private resumeResolver: (() => void) | null = null;

  constructor(initiallyPaused: boolean = false) {
    this.isPaused = initiallyPaused;
    if (initiallyPaused) {
      this.createResumePromise();
    }
  }

  // Wait if paused
  public async waitIfPaused(): Promise<void> {
    if (this.isPaused) {
      await this.resumePromise;
    }
  }

  // Is the system currently running?
  public isActive(): boolean {
    return !this.isPaused;
  }

  // Pause execution
  public pause(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      this.createResumePromise();
    }
  }

  // Resume execution
  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
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
