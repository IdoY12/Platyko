import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { applyNotificationsToggle } from "@/utils/profileUiAndPreferences";
import { fetchAndApplyProfile } from "@/utils/profileLoadFromApi";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import UserServiceClass from "@/services/auth-aware/UserService";
import { useProfileAccountHandlers } from "./useProfileAccountHandlers";
import { useProfileAvatarHandlers } from "./useProfileAvatarHandlers";
import { useProfileDraftState } from "./useProfileDraftState";
import { useProfileRedux } from "./useProfileRedux";

/** Everything the Settings screen reads and does with the account; guests get the local parts. */
export function useAccountSettings() {
  const dispatch = useAppDispatch();
  const user = useAuthenticatedService(UserServiceClass);
  const profileRedux = useProfileRedux();
  const profileDraft = useProfileDraftState(profileRedux);
  const { setDraftUsername, setDraftNotifications } = profileDraft;

  useEffect(() => setDraftUsername(profileRedux.username), [profileRedux.username, setDraftUsername]);

  // Only signed-in vs. guest matters here; a token rotation must not refetch and overwrite drafts.
  const hasSession = Boolean(profileRedux.accessToken);
  const setNotificationsRef = useRef(setDraftNotifications);
  useEffect(() => {
    if (!hasSession) return;
    let active = true;
    void fetchAndApplyProfile(user, dispatch, setNotificationsRef.current, () => active);
    return () => {
      active = false;
    };
  }, [hasSession, dispatch, user]);

  const handlers = useProfileAccountHandlers(profileRedux, profileDraft, user);
  const { onAvatarPress } = useProfileAvatarHandlers(profileRedux, profileDraft, user);

  const onNotificationsEnabledChange = useCallback(
    (notificationsEnabled: boolean) => applyNotificationsToggle(notificationsEnabled, user, dispatch, setDraftNotifications, profileRedux),
    [dispatch, profileRedux, setDraftNotifications, user],
  );

  return { ...profileRedux, ...profileDraft, onAvatarPress, onNotificationsEnabledChange, ...handlers };
}

export type AccountSettings = ReturnType<typeof useAccountSettings>;
