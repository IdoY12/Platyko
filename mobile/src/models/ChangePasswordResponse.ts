/** The old tokens die with the password change; these replace them on this device. */
export default interface ChangePasswordResponse {
  ok: true;
  accessToken: string;
  refreshToken: string;
}
