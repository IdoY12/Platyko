/**
 * Lists substrings used to redact sensitive keys in structured logs.
 *
 * Responsibility: centralize which request/log field names are considered secrets.
 * Layer: @project/server-kit/logger
 * Depends on: none
 * Consumers: redactValue.ts
 */

export const SENSITIVE_KEY_SUBSTRINGS = [
  "email",
  "password",
  "hashedpassword",
  "currentpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "answer",
  "correctanswer",
  "acceptedanswers",
  "explanation",
  "fullname",
  "givenname",
  "familyname",
] as const;

/** Whole-key matches for short names that would over-match as substrings (`code` vs `statusCode`). */
export const SENSITIVE_KEYS_EXACT = ["code"] as const;
