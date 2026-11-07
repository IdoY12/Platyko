/**
 * Type guards for client → server duel payloads.
 *
 * Responsibility: turn an untrusted `unknown` socket payload into checked fields, so handlers never
 * throw (and never log an ERROR) on malformed input — a malformed payload is simply ignored.
 * Layer: io duel
 * Depends on: none
 * Consumers: handlers/*.ts
 */

import { CALENDAR_DATE_PATTERN } from "@project/streak-logic";

/** Session ids are `sess_<uuid>`; anything longer is not one of ours. */
const SESSION_ID_MAX_LEN = 64;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The `session_id` string of a payload, or null when absent / not a plausible id. */
export function sessionIdOf(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const id = payload.session_id;
  return typeof id === "string" && id.length > 0 && id.length <= SESSION_ID_MAX_LEN ? id : null;
}

/** The client's local calendar date for streak credit, or null when missing or malformed. */
export function readStreakLocalDate(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const date = payload.streak_local_date;
  return typeof date === "string" && CALENDAR_DATE_PATTERN.test(date) ? date : null;
}

export type SubmitAnswerPayload = { sessionId: string; roundNumber: number; answer: string; timeTakenMs: number };

/** Every field of a `submit_answer` payload checked; null when any is missing or the wrong type. */
export function readSubmitAnswerPayload(payload: unknown): SubmitAnswerPayload | null {
  const sessionId = sessionIdOf(payload);
  if (!sessionId || !isRecord(payload)) return null;
  const { round_number: roundNumber, answer, time_taken_ms: timeTakenMs } = payload;
  if (!Number.isInteger(roundNumber) || typeof answer !== "string") return null;
  if (typeof timeTakenMs !== "number" || !Number.isFinite(timeTakenMs) || timeTakenMs < 0) return null;
  // A round lasts 60 s; anything beyond is a bad clock or a crafted payload, never stored as-is.
  return { sessionId, roundNumber: roundNumber as number, answer: answer.slice(0, 2000), timeTakenMs: Math.min(timeTakenMs, 60_000) };
}
