import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlyphScrambleText } from "@/components/common/GlyphScrambleText/GlyphScrambleText";
import { MatrixBurst } from "@/components/common/MatrixBurst/MatrixBurst";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { TerminalHeader } from "@/components/common/TerminalHeader/TerminalHeader";
import { DuelReplayList } from "./DuelReplayList";
import { colors } from "@/theme/theme";
import { logNav } from "@/utils/logger";
import { duelConnectionRefs } from "@/utils/duelSocketModels";
import { duelResetMatch } from "@/utils/duelSocketCommands";
import { useDuelResultsSocket } from "@/hooks/useDuelSocket";
import type { DuelResultsScreenProps } from "@/types/duelNavigation.types";
import { styles } from "./DuelNavigator.styles";

export function DuelResultsScreen({ route, navigation }: DuelResultsScreenProps) {
  const { won, score, xpEarned, replay = [], opponentDisconnected, tied } = route.params;
  const { sessionId, rematchStatus, requestRematch } = useDuelResultsSocket();
  const initialSessionIdRef = useRef(sessionId);
  const matchFoundRef = useRef(false);
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => { logNav("screen:enter", { screen: "DuelResultsScreen" }); return () => logNav("screen:leave", { screen: "DuelResultsScreen" }); }, []);

  useEffect(() => {
    if (rematchStatus === "opponent_left" || opponentDisconnected) { setIsWaiting(false); return; }
    if (isWaiting && sessionId && sessionId !== initialSessionIdRef.current) { matchFoundRef.current = true; setIsWaiting(false); navigation.replace("ActiveDuel"); }
  }, [sessionId, isWaiting, rematchStatus, navigation, opponentDisconnected]);

  useEffect(() => {
    const abandon = () => { if (!matchFoundRef.current && initialSessionIdRef.current) duelConnectionRefs.socket?.emit("rematch_abandoned", { session_id: initialSessionIdRef.current }); };
    const unsubRemove = navigation.addListener("beforeRemove", abandon);
    return () => unsubRemove();
  }, [navigation]);

  const goHome = () => { duelResetMatch(); navigation.popToTop(); };

  if (rematchStatus === "opponent_left" || opponentDisconnected) {
    return (
      <SafeAreaView style={styles.arenaContainer} edges={["top"]}>
        <TerminalHeader title="~/duel/results $" onBack={() => navigation.goBack()} />
        <View style={styles.screenBody}>
          <Text style={styles.title}>Opponent left</Text>
          <PressableScale style={styles.matchBtn} haptic="light" onPress={goHome}><Text style={styles.matchLabel}>Back to Duel Home</Text></PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.arenaContainer} edges={["top"]}>
      <TerminalHeader title="~/duel/results $" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.list} contentContainerStyle={styles.duelContent}>
        <GlyphScrambleText text={tied ? "Tied!" : won ? "Victory!" : "Defeat"} style={styles.title} />
        {won ? <MatrixBurst color={colors.duel} /> : null}
        <Text style={styles.sub}>Final score: {score}</Text>
        <Text style={styles.sub}>{tied ? "It's a tie." : won ? "You won this duel." : "You lost this duel."}{xpEarned > 0 ? ` You earned ${xpEarned} XP.` : " Well done!"}</Text>
        <TerminalFrame label="code.replay" style={styles.replayCard}>
          <DuelReplayList replay={replay} />
        </TerminalFrame>
        <PressableScale style={styles.matchBtn} haptic="medium" onPress={goHome}><Text style={styles.matchLabel}>Back to Duel Home</Text></PressableScale>
        <PressableScale style={styles.secondaryBtn} haptic="light" onPress={() => { if (sessionId) { setIsWaiting(true); requestRematch(sessionId); } }}>
          <Text style={styles.secondaryLabel}>Play Again</Text>
        </PressableScale>
        {isWaiting ? <Text style={styles.searching}>Waiting for opponent to confirm rematch…</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
