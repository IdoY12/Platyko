const CONCURRENT_REQUESTS = 6;
const REQUEST_TIMEOUT_MILLISECONDS = 20_000;
const USER_AGENT = "platyko-content-tools";

/** The part of the global `fetch` this package uses; tests inject their own. */
export type FetchFunction = (url: string, init: RequestInit) => Promise<Response>;

/** One GET that follows redirects and gives up after the timeout. */
export function fetchPage(url: string, fetchFunction: FetchFunction = fetch): Promise<Response> {
  return fetchFunction(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
    headers: { "User-Agent": USER_AGENT },
  });
}

/** Runs `worker` over every value, a few at a time, and returns the results in input order. */
export async function mapConcurrently<Value, Result>(
  values: Value[],
  worker: (value: Value) => Promise<Result>,
): Promise<Result[]> {
  const results = new Array<Result>(values.length);
  let nextIndex = 0;
  const runner = async (): Promise<void> => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await worker(values[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENT_REQUESTS, values.length) }, runner));
  return results;
}
