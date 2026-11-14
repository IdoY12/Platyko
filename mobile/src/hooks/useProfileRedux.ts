import { useAppSelector } from "@/redux/hooks";

export function useProfileRedux() {
  const username = useAppSelector((s) => s.profile.username);
  const avatarUrl = useAppSelector((s) => s.profile.avatarUrl);
  const notificationsEnabled = useAppSelector((s) => s.profile.notificationsEnabled);
  const hasPassword = useAppSelector((s) => s.profile.hasPassword);
  const accessToken = useAppSelector((s) => s.session.accessToken);
  const refreshToken = useAppSelector((s) => s.session.refreshToken);
  return { username, avatarUrl, notificationsEnabled, hasPassword, accessToken, refreshToken };
}

export type ProfileReduxState = ReturnType<typeof useProfileRedux>;
