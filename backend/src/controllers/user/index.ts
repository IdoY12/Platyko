/**
 * Barrel re-exports for modular user-domain HTTP handlers.
 *
 * Responsibility: single import surface for the user router wiring.
 * Layer: backend user controllers
 * Depends on: ./handlers in this folder
 * Consumers: routers/user.ts
 */

export { deleteAccount } from "./deleteAccountHandler.js";
export { getPreferences } from "./getPreferencesHandler.js";
export { getProfile } from "./getProfileHandler.js";
export { getProgressSummary } from "./getProgressSummaryHandler.js";
export { patchAvatar, putAvatarDirectUpload } from "./patchAvatarHandler.js";
export { patchPreferences } from "./patchPreferencesHandler.js";
export { patchProfile } from "./patchProfileHandler.js";
export { postChangePassword } from "./postChangePasswordHandler.js";
export { postPracticeLog } from "./postPracticeLogHandler.js";
