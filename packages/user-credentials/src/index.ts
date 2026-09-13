export const USERNAME_MIN_LEN = 2;
export const USERNAME_MAX_LEN = 25;
export const EMAIL_MIN_LEN = 5;
export const EMAIL_MAX_LEN = 254;
export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 64;

export const USERNAME_TOO_SHORT = `Username must be at least ${USERNAME_MIN_LEN} characters.`;
export const USERNAME_TOO_LONG = `Username must be at most ${USERNAME_MAX_LEN} characters.`;
export const EMAIL_TOO_SHORT = `Email must be at least ${EMAIL_MIN_LEN} characters.`;
export const EMAIL_TOO_LONG = `Email must be at most ${EMAIL_MAX_LEN} characters.`;
export const PASSWORD_TOO_SHORT = `Password must be at least ${PASSWORD_MIN_LEN} characters.`;
export const PASSWORD_TOO_LONG = `Password must be at most ${PASSWORD_MAX_LEN} characters.`;
export const EMAIL_INVALID = "Enter a valid email address.";
export const USERNAME_TAKEN_MESSAGE = "Username already taken. Please choose another.";
export const EMAIL_TAKEN_MESSAGE = "Email already exists";

export function passwordPolicyError(password: string): string | null {
  const pl = password.length;
  if (pl < PASSWORD_MIN_LEN) return PASSWORD_TOO_SHORT;
  if (pl > PASSWORD_MAX_LEN) return PASSWORD_TOO_LONG;
  return null;
}

export function registerValidationError(email: string, username: string, password: string): string | null {
  const el = email.length;
  if (el < EMAIL_MIN_LEN) return EMAIL_TOO_SHORT;
  if (el > EMAIL_MAX_LEN) return EMAIL_TOO_LONG;
  const ul = username.length;
  if (ul < USERNAME_MIN_LEN) return USERNAME_TOO_SHORT;
  if (ul > USERNAME_MAX_LEN) return USERNAME_TOO_LONG;
  return passwordPolicyError(password);
}

export function usernameValidationError(username: string): string | null {
  const n = username.length;
  if (n < USERNAME_MIN_LEN) return USERNAME_TOO_SHORT;
  if (n > USERNAME_MAX_LEN) return USERNAME_TOO_LONG;
  return null;
}
