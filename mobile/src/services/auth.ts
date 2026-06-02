import axios from "axios";
import { API_BASE_URL } from "@/config/network";
import type AuthResponse from "@/models/AuthResponse";
import type { RootState } from "@/redux/store";

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === "object" && "error" in error.response.data) {
    return String((error.response.data as { error: unknown }).error);
  }
  return error instanceof Error ? error.message : "Unable to continue";
}

type GuestLocalState = {
  experienceLevel?: string; goal?: string; commitment?: string; notificationsEnabled?: boolean;
  blockProgress?: Record<string, number>; xpTotal?: number; streakCurrent?: number;
  streakLastActivityDate?: string | null; streakLastCheckedDate?: string | null;
  puzzleXpSolveCounts?: Record<string, number>;
};

export function buildGuestLocalState({ profile, lesson, xp, streak, puzzle }: RootState): GuestLocalState {
  return {
    experienceLevel: profile.experienceLevel, goal: profile.goal, commitment: profile.commitment,
    notificationsEnabled: profile.notificationsEnabled, blockProgress: lesson.blockProgress,
    xpTotal: xp.xpTotal, streakCurrent: streak.streakCurrent,
    streakLastActivityDate: streak.lastActivityDate ?? undefined,
    streakLastCheckedDate: streak.lastCheckedDate ?? undefined,
    puzzleXpSolveCounts: puzzle.xpSolveCounts,
  };
}

function groupBlockProgressByLevel(local: Record<string, number>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const [key, index] of Object.entries(local)) {
    const match = /^([A-Z]+)_block(\d+)$/.exec(key);
    if (!match) continue;
    (result[match[1]] ??= {})[match[2]] = index;
  }
  return result;
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password });
    return data;
  }

  async register(email: string, username: string, password: string, local?: GuestLocalState): Promise<AuthResponse> {
    try {
      const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/register`, {
        email, username, password,
        experienceLevel: local?.experienceLevel,
        goal: local?.goal,
        dailyCommitmentMinutes: local?.commitment ? Number(local.commitment) : undefined,
        notificationsEnabled: local?.notificationsEnabled,
        blockProgress: local?.blockProgress ? groupBlockProgressByLevel(local.blockProgress) : undefined,
        xpTotal: local?.xpTotal,
        streakCurrent: local?.streakCurrent,
        streakLastActivityDate: local?.streakLastActivityDate,
        streakLastCheckedDate: local?.streakLastCheckedDate,
        puzzleXpSolveCounts: local?.puzzleXpSolveCounts,
      });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/google`, { idToken });
      return data;
    } catch (e) {
      throw new Error(apiErrorMessage(e));
    }
  }
}

const authService = new AuthService();
export default authService;
