import { parentPort } from "node:worker_threads";
import type { ProgramJob } from "./programRunnerPool.js";
import { runProgram } from "./runProgram.js";

// Receives a batch of jobs and answers with one message per job, in order.
parentPort?.on("message", (jobs: ProgramJob[]) => {
  for (const job of jobs) parentPort?.postMessage(runProgram(job.source, job.options));
});
// The first message tells the pool that the modules are loaded and jobs can come.
parentPort?.postMessage("ready");
