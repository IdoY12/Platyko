import type { PromiseEvent } from "../execute/runProgram.js";

/** A job in the modelled microtask queue. Its label is known once it runs. */
export type MicrotaskJob = { label: string | null; isCancelled: boolean };

type QueuedJob = MicrotaskJob & (
  | { kind: "reaction" }
  /** Resolves a promise with `thenable`, by calling its `then`. */
  | { kind: "thenable"; thenable: object }
);

/**
 * A first-in-first-out model of the engine's microtask queue, built from promise events. The
 * engine never shows its queue, so the model checks itself: every job the engine starts must be
 * the head of the modelled queue, and the queue must be empty when a task ends.
 */
export class MicrotaskModel {
  /** Set when the model and the engine disagree; the trace is then not trustworthy. */
  failure: string | null = null;
  private readonly queue: QueuedJob[] = [];
  private readonly settledPromises = new WeakSet<object>();
  /** Reaction jobs that wait for a promise to settle, in registration order. */
  private readonly waitingReactions = new Map<object, QueuedJob[]>();
  /** The reaction job of each derived promise, until it starts. */
  private readonly reactionJobs = new Map<object, QueuedJob>();
  /** `then` lookups not yet followed by a call: the engine may have read `then` to resolve a promise. */
  private readonly unmatchedLookups = new Map<object, QueuedJob[]>();
  private runningJob: QueuedJob | null = null;
  private expectsThenCall = false;

  /** The jobs waiting now, front first. A job cancelled later was never real: drop it when reading. */
  queuedJobs(): MicrotaskJob[] {
    return [...this.queue];
  }

  /** The first thing a job does names it. */
  labelRunningJob(label: string): void {
    if (this.runningJob !== null) this.runningJob.label ??= label;
  }

  /** Between tasks nothing runs and nothing may be left waiting. */
  taskEnded(): void {
    this.runningJob = null;
    if (this.nextJob() !== undefined) this.fail("a microtask was still queued when its task ended");
  }

  handle(event: Exclude<PromiseEvent, { kind: "reactionRuns" }>): void {
    switch (event.kind) {
      case "reactionRegistered": {
        if (this.reactionJobs.has(event.derived)) return;
        const job: QueuedJob = { kind: "reaction", label: null, isCancelled: false };
        this.reactionJobs.set(event.derived, job);
        if (this.settledPromises.has(event.promise)) this.queue.push(job);
        else this.waitingReactions.set(event.promise, [...(this.waitingReactions.get(event.promise) ?? []), job]);
        return;
      }
      case "reactionRetracted": {
        const job = this.reactionJobs.get(event.derived);
        if (job !== undefined) job.isCancelled = true;
        this.reactionJobs.delete(event.derived);
        return;
      }
      case "settled":
        this.settledPromises.add(event.promise);
        this.queue.push(...(this.waitingReactions.get(event.promise) ?? []));
        this.waitingReactions.delete(event.promise);
        return;
      case "thenLookedUp": {
        // Assume the engine resolves a promise with this one, which queues a job at once. If a
        // call to `then` follows, the lookup was an ordinary method call and the job is cancelled.
        const job: QueuedJob = { kind: "thenable", thenable: event.promise, label: null, isCancelled: false };
        this.queue.push(job);
        this.unmatchedLookups.set(event.promise, [...(this.unmatchedLookups.get(event.promise) ?? []), job]);
        return;
      }
      case "thenCalled": {
        if (this.expectsThenCall) {
          this.expectsThenCall = false;
          if (this.runningJob?.kind !== "thenable" || this.runningJob.thenable !== event.promise) {
            this.fail("a promise was resolved with a thenable the model did not expect");
          }
          return;
        }
        const job = this.unmatchedLookups.get(event.promise)?.pop();
        if (job !== undefined) job.isCancelled = true;
        return;
      }
      case "jobStarted": {
        const job = this.nextJob();
        const reactionJob = this.reactionJobs.get(event.promise);
        this.reactionJobs.delete(event.promise);
        this.queue.shift();
        this.runningJob = job ?? null;
        this.expectsThenCall = reactionJob === undefined;
        const isHead = reactionJob !== undefined ? job === reactionJob : job?.kind === "thenable";
        if (!isHead) return this.fail("the engine started a microtask that was not at the head of the modelled queue");
        if (job?.kind === "thenable") {
          const lookups = this.unmatchedLookups.get(job.thenable) ?? [];
          lookups.splice(lookups.indexOf(job), 1);
        }
      }
    }
  }

  /** The head of the queue, after dropping cancelled jobs in front of it. */
  private nextJob(): QueuedJob | undefined {
    while (this.queue[0]?.isCancelled === true) this.queue.shift();
    return this.queue[0];
  }

  private fail(reason: string): void {
    this.failure ??= reason;
  }
}
