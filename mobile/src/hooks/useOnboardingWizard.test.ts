import { beforeEach, describe, expect, it, vi } from "vitest";
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const h = vi.hoisted(() => ({
  stateIndex: 0,
  stateValues: [1, "JUNIOR", "FUN", "15", false, null] as unknown[],
  dispatch: vi.fn(),
  reduxState: { session: { accessToken: null as string | null }, profile: { notificationsEnabled: true } },
  patchPreferences: vi.fn(),
}));

vi.mock("react", () => ({
  useState: (init: unknown) => [h.stateIndex < h.stateValues.length ? h.stateValues[h.stateIndex++] : init, vi.fn()],
  useEffect: vi.fn(),
  useMemo: (factory: () => unknown) => factory(),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { setItem: vi.fn(async () => {}) } }));
vi.mock("@/redux/hooks", () => ({
  useAppDispatch: () => h.dispatch,
  useAppSelector: (selector: (s: typeof h.reduxState) => unknown) => selector(h.reduxState),
}));
vi.mock("@/hooks/useAuthenticatedService", () => ({
  useAuthenticatedService: () => (h.reduxState.session.accessToken ? { patchPreferences: h.patchPreferences } : null),
}));
vi.mock("@/services/auth", () => ({ apiErrorMessage: () => "error" }));
vi.mock("@/services/auth-aware/UserService", () => ({ default: class {} }));

import { completeOnboarding } from "@/redux/profile-slice";
import { useOnboardingWizard } from "@/hooks/useOnboardingWizard";

describe("useOnboardingWizard notifications preference", () => {
  beforeEach(() => {
    h.stateIndex = 0;
    h.dispatch.mockReset();
    h.patchPreferences.mockReset();
  });

  it("signed-in onboarding re-run with server OFF keeps notifications OFF", async () => {
    h.reduxState.session.accessToken = "token";
    h.reduxState.profile.notificationsEnabled = false;
    h.patchPreferences.mockResolvedValue({
      goal: "FUN", experienceLevel: "JUNIOR", dailyCommitmentMinutes: 15, notificationsEnabled: false,
    });

    await useOnboardingWizard({ onPersistedToDevice: vi.fn() }).submitOnboarding();

    expect(h.patchPreferences).toHaveBeenCalledWith(expect.objectContaining({ notificationsEnabled: false }));
    expect(h.dispatch).toHaveBeenCalledWith(
      completeOnboarding({ experienceLevel: "JUNIOR", goal: "FUN", commitment: "15", notificationsEnabled: false }),
    );
  });

  it("new guest user still defaults notifications ON", async () => {
    h.reduxState.session.accessToken = null;
    h.reduxState.profile.notificationsEnabled = true;

    await useOnboardingWizard({ onPersistedToDevice: vi.fn() }).submitOnboarding();

    expect(h.patchPreferences).not.toHaveBeenCalled();
    expect(h.dispatch).toHaveBeenCalledWith(
      completeOnboarding({ experienceLevel: "JUNIOR", goal: "FUN", commitment: "15", notificationsEnabled: true }),
    );
  });
});
