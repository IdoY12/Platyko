import { useEffect, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CodeSnippet } from "@/components/common/CodeSnippet/CodeSnippet";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
import { useDuelActiveDuelScreen } from "@/hooks/useDuelActiveDuelScreen";
import type { ActiveDuelScreenProps } from "@/types/duelNavigation.types";
import { duelLeaveDuel } from "@/utils/duelSocketCommands";
import { colors } from "@/theme/theme";
import { DuelActiveAnswerZone } from "./DuelActiveAnswerZone";
import { DuelRoundOverlay } from "./DuelRoundOverlay";
import { DuelScoreRow } from "./DuelScoreRow";
import { styles } from "./DuelNavigator.styles";

export function DuelActiveDuelScreen({ navigation }: ActiveDuelScreenProps) {
  const u = useDuelActiveDuelScreen(navigation);
  const emittedRef = useRef(false);
  /** Score shown on the previous round overlay — lets the overlay know a round was just won. */
  const lastShownScoreRef = useRef(0);
  const wonRound = u.overlayVisible && u.myScore > lastShownScoreRef.current;

  useEffect(() => {
    if (u.overlayVisible) lastShownScoreRef.current = u.myScore;
  }, [u.overlayVisible, u.myScore]);

  useEffect(() => {
    if (!u.sessionId) navigation.goBack();
  }, [u.sessionId, navigation]);

  useEffect(() => {
    emittedRef.current = false;
    const sid = u.sessionId;
    const leave = () => {
      if (u.skipLeaveAfterEndRef.current || !sid || emittedRef.current) return;
      emittedRef.current = true; duelLeaveDuel(sid);
    };
    return navigation.addListener("beforeRemove", leave);
  }, [navigation, u.sessionId]);

  return (
    <SafeAreaView style={styles.arenaContainer} edges={["top"]}>
      <TerminalHeader title="~/duel/live $" onBack={() => navigation.goBack()} />
      {!u.round ? (
        <View style={styles.screenBody}>
          <MatrixRain opacity={0.4} color={colors.duel} />
          <Text style={styles.sub}>{u.opponentLeft ? "Opponent left, calculating result…" : "Waiting for round start..."}</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.duelContent} showsVerticalScrollIndicator={false}>
          <DuelScoreRow
            username={u.username}
            myScore={u.myScore}
            oppScore={u.oppScore}
            roundNumber={u.roundNumber}
            opponentName={u.opponentName}
            opponentAvatarUrl={u.opponentAvatarUrl}
          />
          <Text style={styles.sub}>You can choose up to 3 answers. ({u.attemptsLeft} remaining)</Text>
          <Text style={styles.cardTitle}>{u.round.prompt}</Text>
          <CodeSnippet code={u.round.codeSnippet} />
          <View style={styles.card}>
            <DuelActiveAnswerZone round={u.round} selected={u.selected} locked={u.locked} submit={u.submit} />
          </View>
        </ScrollView>
      )}
      <DuelRoundOverlay
        visible={u.overlayVisible}
        connectionLost={u.connectionLost}
        lastCorrectAnswer={u.lastCorrectAnswer}
        myScore={u.myScore}
        oppScore={u.oppScore}
        wonRound={wonRound}
      />
    </SafeAreaView>
  );
}
