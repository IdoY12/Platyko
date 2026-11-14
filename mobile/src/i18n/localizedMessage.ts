import { SOCIAL_ERRORS } from "@project/api-contract";
import type { MessageKey } from "@project/locales";
import {
  EMAIL_INVALID, EMAIL_MAX_LEN, EMAIL_MIN_LEN, EMAIL_TAKEN_MESSAGE, EMAIL_TOO_LONG, EMAIL_TOO_SHORT,
  PASSWORD_MAX_LEN, PASSWORD_MIN_LEN, PASSWORD_TOO_LONG, PASSWORD_TOO_SHORT,
  USERNAME_MAX_LEN, USERNAME_MIN_LEN, USERNAME_NOT_ALLOWED, USERNAME_TAKEN_MESSAGE, USERNAME_TOO_LONG, USERNAME_TOO_SHORT,
} from "@project/user-credentials";
import { serverErrorMessage } from "@/services/auth";
import { t } from "./translate";

/**
 * Server replies and the shared credential rules (`@project/user-credentials`) are written in
 * English. Every message a learner can see is mapped here to the UI language; an unknown
 * message becomes the generic one, so raw English or internal text never reaches the screen.
 */
const EXACT_MESSAGES: Record<string, MessageKey> = {
  "Invalid credentials": "errors.invalidCredentials",
  "User not found": "errors.accountNotFound",
  "Invalid request": "errors.invalidRequest",
  "Service is temporarily unavailable. Please try again.": "errors.serviceUnavailable",
  "Could not send the email. Try again later.": "errors.emailSendFailed",
  [USERNAME_TAKEN_MESSAGE]: "errors.usernameTaken",
  [EMAIL_TAKEN_MESSAGE]: "errors.emailTaken",
  "Too many codes requested for this address. Try again in an hour.": "errors.tooManyCodes",
  "Too many attempts. Please try again later.": "errors.tooManyAttempts",
  "This account uses social sign-in. Set a password first.": "errors.socialAccountNoPassword",
  "Invalid Google token": "errors.socialSignInFailed",
  "Invalid Apple token": "errors.socialSignInFailed",
  "Current password is incorrect": "errors.currentPasswordWrong",
  "Avatar must be a JPEG image": "errors.photoInvalid",
  "Empty or invalid image body": "errors.photoInvalid",
  "Apple did not share an email for this account. In Settings > Apple ID > Sign-In & Security, remove this app and try again.": "errors.appleNoEmail",
  "Incorrect code. Please try again.": "errors.codeIncorrect",
  "No active code for this account. Request a new one.": "errors.codeMissing",
  "This code has expired. Request a new one.": "errors.codeExpired",
  "Too many wrong attempts. Request a new code.": "errors.codeTooManyAttempts",
  "This code is no longer active. If you already verified your email, sign in; otherwise register again.": "errors.registrationMissing",
  "This registration was replaced by a newer one. Please register again.": "errors.registrationReplaced",
  "This email is already registered with a password. Sign in with email and password.": "errors.emailHasPassword",
  "This email is linked to a Google account. Sign in with Google.": "errors.emailLinkedGoogle",
  "This email is linked to an Apple ID. Sign in with Apple.": "errors.emailLinkedApple",
  [EMAIL_INVALID]: "errors.emailInvalid",
  [USERNAME_NOT_ALLOWED]: "errors.usernameNotAllowed",
  [SOCIAL_ERRORS.userNotFound]: "errors.userNotFound",
  [SOCIAL_ERRORS.cannotAddSelf]: "errors.cannotAddSelf",
  [SOCIAL_ERRORS.codeOnly]: "errors.codeOnly",
  [SOCIAL_ERRORS.alreadyFriends]: "errors.alreadyFriends",
  [SOCIAL_ERRORS.tooManyRequests]: "errors.tooManyRequests",
  [SOCIAL_ERRORS.friendLimit]: "errors.friendLimit",
  [SOCIAL_ERRORS.requestNotFound]: "errors.requestNotFound",
};

/** The shared length rules, each with the limit it names. */
const LENGTH_MESSAGES: Record<string, { key: MessageKey; limit: number }> = {
  [EMAIL_TOO_SHORT]: { key: "errors.emailTooShort", limit: EMAIL_MIN_LEN },
  [EMAIL_TOO_LONG]: { key: "errors.emailTooLong", limit: EMAIL_MAX_LEN },
  [PASSWORD_TOO_SHORT]: { key: "errors.passwordTooShort", limit: PASSWORD_MIN_LEN },
  [PASSWORD_TOO_LONG]: { key: "errors.passwordTooLong", limit: PASSWORD_MAX_LEN },
  [USERNAME_TOO_SHORT]: { key: "errors.usernameTooShort", limit: USERNAME_MIN_LEN },
  [USERNAME_TOO_LONG]: { key: "errors.usernameTooLong", limit: USERNAME_MAX_LEN },
};

/** The server's resend cooldown names the seconds left. */
const RESEND_WAIT = /^Please wait (\d+)s before requesting another code$/;

export function localizedMessage(message: string): string {
  const exact = EXACT_MESSAGES[message];
  if (exact) return t(exact);
  const length = LENGTH_MESSAGES[message];
  if (length) return t(length.key, { limit: length.limit });
  const wait = RESEND_WAIT.exec(message);
  return wait ? t("errors.resendWait", { seconds: Number(wait[1]) }) : t("errors.generic");
}

/**
 * The learner-facing text for a caught error: the server's message when the reply carries one
 * (account calls throw the raw HTTP error), else the error's own message, translated.
 */
export function localizedError(error: unknown): string {
  const message = serverErrorMessage(error) ?? (error instanceof Error ? error.message : null);
  return message === null ? t("errors.generic") : localizedMessage(message);
}
