type VirtualTimer = {
  id: number;
  /** The program's callback. Never called from here; kept so that a trace can label the timer. */
  callback: unknown;
  delay: number;
  repeats: boolean;
  fireTime: number;
};

/** Timers on a virtual clock: time starts at 0 and jumps to the fire time of each timer that runs. */
export class VirtualTimers {
  /** Every delay passed to `setTimeout` or `setInterval`, in call order. */
  readonly delays: number[] = [];
  private readonly pending: VirtualTimer[] = [];
  private running: VirtualTimer | null = null;
  private now = 0;

  /** Coerces the delay the way browsers do: anything that is not a positive number means 0. */
  schedule(callback: unknown, delay: number, repeats: boolean): number {
    const coercedDelay = Number.isFinite(delay) && delay > 0 ? Math.trunc(delay) : 0;
    this.delays.push(coercedDelay);
    const id = this.delays.length;
    this.enqueue({ id, callback, delay: coercedDelay, repeats, fireTime: 0 });
    return id;
  }

  cancel(id: number): void {
    const index = this.pending.findIndex((timer) => timer.id === id);
    if (index !== -1) this.pending.splice(index, 1);
    if (this.running?.id === id) this.running = null;
  }

  hasPending(): boolean {
    return this.pending.length > 0;
  }

  /** Callbacks of the waiting timers, next to fire first. */
  pendingCallbacks(): unknown[] {
    return this.pending.map((timer) => timer.callback);
  }

  /** Moves the clock to the next timer and makes it the running one. */
  startNext(): void {
    this.running = this.pending.shift() ?? null;
    this.now = this.running?.fireTime ?? this.now;
  }

  runningTimerId(): number | undefined {
    return this.running?.id;
  }

  /** An interval that was not cleared while it ran waits again, one delay from now. */
  finishRunning(): void {
    if (this.running?.repeats === true) this.enqueue(this.running);
    this.running = null;
  }

  private enqueue(timer: VirtualTimer): void {
    timer.fireTime = this.now + timer.delay;
    this.pending.push(timer);
    // The sort is stable: timers with the same fire time keep their insertion order.
    this.pending.sort((first, second) => first.fireTime - second.fireTime);
  }
}
