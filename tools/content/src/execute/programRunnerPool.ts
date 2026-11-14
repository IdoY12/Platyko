import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { RunOptions, RunResult } from "./runProgram.js";

/** The worker file is TypeScript, so every worker loads tsx, whatever started this process and from where. */
const TSX_LOADER_URL = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
const JOBS_PER_BATCH = 200;
const JOB_WALL_CLOCK_LIMIT_MS = 2000;

export type ProgramJob = { source: string; options?: RunOptions };

type Batch = {
  jobs: ProgramJob[];
  results: RunResult[];
  resolve: (results: RunResult[]) => void;
  reject: (error: unknown) => void;
};

/** Runs programs on worker threads. A job that hangs its worker is reported as timed out and the worker is replaced. */
export class ProgramRunnerPool {
  private readonly size: number;
  private readonly workers = new Set<Worker>();
  private readonly idleWorkers: Worker[] = [];
  private readonly waitingBatches: Batch[] = [];

  constructor(size = availableParallelism() - 1) {
    this.size = Math.max(1, size);
  }

  async run(source: string, options?: RunOptions): Promise<RunResult> {
    const [result] = await this.runMany([{ source, options }]);
    return result;
  }

  /** Results come back in the order of `jobs`. */
  async runMany(jobs: ProgramJob[]): Promise<RunResult[]> {
    const batches: Promise<RunResult[]>[] = [];
    for (let start = 0; start < jobs.length; start += JOBS_PER_BATCH) {
      batches.push(
        new Promise((resolve, reject) => {
          this.waitingBatches.push({ jobs: jobs.slice(start, start + JOBS_PER_BATCH), results: [], resolve, reject });
        }),
      );
    }
    this.assignBatches();
    return (await Promise.all(batches)).flat();
  }

  async close(): Promise<void> {
    await Promise.all([...this.workers].map((worker) => worker.terminate()));
    this.workers.clear();
    this.idleWorkers.length = 0;
  }

  private assignBatches(): void {
    while (this.waitingBatches.length > 0) {
      const worker = this.idleWorkers.pop();
      if (worker !== undefined) this.runBatch(worker, this.waitingBatches.shift()!);
      else if (this.workers.size < this.size) this.startWorker();
      else return;
    }
  }

  private startWorker(): void {
    const worker = new Worker(new URL("./programRunnerWorker.ts", import.meta.url), { execArgv: ["--import", TSX_LOADER_URL] });
    this.workers.add(worker);
    // Its first message says it is ready; the wall clock of a job never includes the start-up.
    worker.once("message", () => this.release(worker));
  }

  private release(worker: Worker): void {
    this.idleWorkers.push(worker);
    this.assignBatches();
  }

  private runBatch(worker: Worker, batch: Batch): void {
    let wallClock: NodeJS.Timeout;
    const isUnfinished = (): boolean => batch.results.length < batch.jobs.length;
    const acceptResult = (result: RunResult): void => {
      batch.results.push(result);
      if (!isUnfinished()) batch.resolve(batch.results);
    };
    const onResult = (result: RunResult): void => {
      clearTimeout(wallClock);
      acceptResult(result);
      if (isUnfinished()) return startWallClock();
      worker.off("message", onResult).off("error", onError);
      this.release(worker);
    };
    const onError = (error: unknown): void => {
      clearTimeout(wallClock);
      this.workers.delete(worker);
      batch.reject(error);
    };
    const startWallClock = (): void => {
      wallClock = setTimeout(() => {
        this.workers.delete(worker);
        void worker.terminate();
        acceptResult({ output: [], uncaughtError: null, timedOut: true, timerDelays: [], formatFindings: [] });
        if (isUnfinished()) this.waitingBatches.unshift(batch);
        this.assignBatches();
      }, JOB_WALL_CLOCK_LIMIT_MS);
    };
    worker.on("message", onResult).on("error", onError);
    worker.postMessage(batch.jobs.slice(batch.results.length));
    startWallClock();
  }
}
