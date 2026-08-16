import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./rootNavigation.types";

type DuelReplayRound = {
  roundNumber: number;
  player1TimeMs: number;
  player2TimeMs: number;
  winnerUserId: string | null;
  correctAnswer?: string;
};

export type DuelStackParamList = {
  DuelHome: undefined;
  Matchmaking: undefined;
  ActiveDuel: undefined;
  DuelResults: {
    won: boolean;
    score: string;
    xpEarned: number;
    replay?: DuelReplayRound[];
    opponentDisconnected?: boolean;
    tied?: boolean;
  };
};

/** Composite includes the root stack so the guest guard can `navigate("Auth")` (action bubbles up). */
export type DuelHomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<DuelStackParamList, "DuelHome">,
  NativeStackScreenProps<RootStackParamList>
>;

export type MatchmakingScreenProps = NativeStackScreenProps<DuelStackParamList, "Matchmaking">;

export type ActiveDuelScreenProps = NativeStackScreenProps<DuelStackParamList, "ActiveDuel">;

export type DuelResultsScreenProps = NativeStackScreenProps<DuelStackParamList, "DuelResults">;
