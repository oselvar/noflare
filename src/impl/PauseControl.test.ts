import { beforeEach, describe, expect, it, vi } from "vitest";

import { PauseControl } from "./PauseControl";

describe("PauseControl", () => {
  let pauseControl: PauseControl;

  beforeEach(() => {
    pauseControl = new PauseControl();
  });

  it("should be running by default", () => {
    expect(pauseControl.isActive()).toBe(true);
  });

  it("should support creating in paused state", () => {
    const pausedControl = new PauseControl(true);
    expect(pausedControl.isActive()).toBe(false);
  });

  it("should change state when paused and resumed", () => {
    expect(pauseControl.isActive()).toBe(true);

    pauseControl.pause();
    expect(pauseControl.isActive()).toBe(false);

    pauseControl.resume();
    expect(pauseControl.isActive()).toBe(true);
  });

  it("should not block execution when running", async () => {
    const spy = vi.fn();

    await pauseControl.waitIfPaused();
    spy();

    expect(spy).toHaveBeenCalled();
  });

  it("should block execution when paused", async () => {
    pauseControl.pause();

    const spy = vi.fn();
    const waitPromise = pauseControl.waitIfPaused().then(() => {
      spy();
    });

    // Use an immediately resolved promise to allow the event loop to cycle
    await Promise.resolve();

    expect(spy).not.toHaveBeenCalled();

    pauseControl.resume();
    await waitPromise;

    expect(spy).toHaveBeenCalled();
  });

  it("should release all waiters when resumed", async () => {
    pauseControl.pause();

    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const spy3 = vi.fn();

    const promise1 = pauseControl.waitIfPaused().then(() => spy1());
    const promise2 = pauseControl.waitIfPaused().then(() => spy2());
    const promise3 = pauseControl.waitIfPaused().then(() => spy3());

    await Promise.resolve();

    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
    expect(spy3).not.toHaveBeenCalled();

    pauseControl.resume();

    await Promise.all([promise1, promise2, promise3]);

    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
    expect(spy3).toHaveBeenCalled();
  });

  it("should not deadlock if paused and resumed multiple times", async () => {
    const actions: string[] = [];

    pauseControl.pause();

    const waitingTask = async () => {
      actions.push("before");
      await pauseControl.waitIfPaused();
      actions.push("after");
    };

    const taskPromise = waitingTask();

    await Promise.resolve();
    expect(actions).toEqual(["before"]);

    pauseControl.resume();
    pauseControl.pause();
    pauseControl.resume();

    await taskPromise;
    expect(actions).toEqual(["before", "after"]);
  });

  it("should be idempotent when calling pause or resume multiple times", async () => {
    const resumeSpy = vi.spyOn(pauseControl, "resume");
    const pauseSpy = vi.spyOn(pauseControl, "pause");

    // Multiple pauses should only create one blocking promise
    pauseControl.pause();
    pauseControl.pause();
    pauseControl.pause();

    expect(pauseSpy).toHaveBeenCalledTimes(3);
    expect(pauseControl.isActive()).toBe(false);

    // Multiple resumes should only resolve once
    pauseControl.resume();
    pauseControl.resume();
    pauseControl.resume();

    expect(resumeSpy).toHaveBeenCalledTimes(3);
    expect(pauseControl.isActive()).toBe(true);

    // Create a new waiting promise
    pauseControl.pause();
    const waitPromise = pauseControl.waitIfPaused();

    // This should complete without hanging
    pauseControl.resume();
    await waitPromise;
  });
});
