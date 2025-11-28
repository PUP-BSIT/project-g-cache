import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Timer {
  /** Configurable focus duration in minutes (default 25). */
  readonly durationMinutes = signal(25);

  /** Remaining time in seconds for the current session. */
  readonly remainingSeconds = signal(this.durationMinutes() * 60);

  /** Whether the timer is currently running (started and not stopped). */
  readonly isRunning = signal(false);

  /** Whether the timer is paused. */
  readonly isPaused = signal(false);

  private intervalId: number | null = null;
  private onCompleteCallback: (() => void) | null = null;

  /** Start or resume the timer. */
  start(): void {
    // If already running and not paused, do nothing.
    if (this.isRunning() && !this.isPaused()) {
      return;
    }

    this.isRunning.set(true);
    this.isPaused.set(false);

    // Create interval if it doesn't exist yet.
    if (this.intervalId === null) {
      this.intervalId = window.setInterval(() => {
        // Only tick when running and not paused.
        if (!this.isRunning() || this.isPaused()) {
          return;
        }

        const current = this.remainingSeconds();
        if (current <= 1) {
          // Reached 0 – stop and clamp at 0.
          this.remainingSeconds.set(0);
          this.stopInternal();
          // Trigger completion callback if set.
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          }
        } else {
          this.remainingSeconds.set(current - 1);
        }
      }, 1000);
    }
  }

  /** Pause the timer without resetting the remaining time. */
  pause(): void {
    if (!this.isRunning() || this.isPaused()) {
      return;
    }
    this.isPaused.set(true);
  }

  /** Stop the timer and reset to the configured duration. */
  stop(): void {
    this.stopInternal();
    this.remainingSeconds.set(this.durationMinutes() * 60);
  }

  /** Set a callback to be called when the timer completes. */
  setOnComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  /** Update the timer duration (in minutes) and reset if not running. */
  setDuration(minutes: number): void {
    if (minutes < 1) {
      minutes = 1;
    }
    this.durationMinutes.set(minutes);
    // If the timer is not currently running, reset to the new duration.
    if (!this.isRunning()) {
      this.remainingSeconds.set(minutes * 60);
    }
  }

  /** Clean up interval and flags, but don't change remaining time. */
  private stopInternal(): void {
    this.isRunning.set(false);
    this.isPaused.set(false);
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
