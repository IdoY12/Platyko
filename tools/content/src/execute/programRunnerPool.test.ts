import { afterAll, describe, expect, it } from "vitest";
import { ProgramRunnerPool } from "./programRunnerPool.js";

describe("ProgramRunnerPool", () => {
  const pool = new ProgramRunnerPool(4);
  afterAll(() => pool.close());

  it("runs one program", async () => {
    expect(await pool.run(`setTimeout(() => console.log("later"), 10); console.log("now");`)).toEqual({
      output: ["now", "later"],
      uncaughtError: null,
      timedOut: false,
      timerDelays: [10],
      formatFindings: [],
    });
  });

  it("runs 5,000 jobs and keeps their order, next to a job that loops forever", async () => {
    const loopingJobIndex = 1234;
    const jobs = Array.from({ length: 5000 }, (_, index) => ({
      source: index === loopingJobIndex ? "while (true) {}" : `console.log(${index} * 2);`,
    }));
    const results = await pool.runMany(jobs);
    expect(results).toHaveLength(jobs.length);
    results.forEach((result, index) => {
      if (index === loopingJobIndex) expect(result).toMatchObject({ output: [], timedOut: true });
      else expect(result).toMatchObject({ output: [String(index * 2)], timedOut: false });
    });
  });

  it("replaces a worker whose job exceeds the wall-clock limit and still finishes the batch", async () => {
    const results = await pool.runMany([
      { source: `console.log("before");` },
      { source: "while (true) {}", options: { timeoutMs: 60_000 } },
      { source: `console.log("after");` },
    ]);
    expect(results.map((result) => [result.output, result.timedOut])).toEqual([[["before"], false], [[], true], [["after"], false]]);
  });

  it("returns nothing for no jobs", async () => {
    expect(await pool.runMany([])).toEqual([]);
  });
});
