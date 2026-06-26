import { useEffect, useRef } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CodeSnippet } from "@/components/common/CodeSnippet/CodeSnippet";
import { useDuelActiveDuelScreen } from "@/hooks/useDuelActiveDuelScreen";
import type { ActiveDuelScreenProps } from "@/types/duelNavigation.types";
import { duelLeaveDuel } from "@/utils/duelSocketCommands";
import { DuelActiveAnswerZone } from "./DuelActiveAnswerZone";
import { styles } from "./DuelNavigator.styles";

export function DuelActiveDuelScreen({ navigation }: ActiveDuelScreenProps) {
  const u = useDuelActiveDuelScreen(navigation);
  const emittedRef = useRef(false);

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
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {!u.round ? (
        <Text style={styles.sub}>{u.opponentLeft ? "Opponent left, calculating result…" : "Waiting for round start..."}</Text>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.duelContent} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{u.username} {u.myScore}</Text>
            <Text style={styles.score}>Round {u.roundNumber}/5</Text>
            <View style={styles.scoreCellEnd}>
              {u.opponentAvatarUrl ? (
                <Image source={{ uri: u.opponentAvatarUrl }} style={styles.duelMiniAvatar} />
              ) : (
                <View style={styles.duelMiniInitial}>
                  <Text style={styles.duelMiniInitialTxt}>{(u.opponentName || "?").slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.score} numberOfLines={1}>{u.opponentName} {u.oppScore}</Text>
            </View>
          </View>
          <Text style={styles.sub}>You can choose up to 3 answers. ({u.attemptsLeft} remaining)</Text>
          <Text style={styles.cardTitle}>{u.round.prompt}</Text>
          <View style={styles.codeWrap}><CodeSnippet code={u.round.codeSnippet} /></View>
          <View style={styles.card}>
            <DuelActiveAnswerZone round={u.round} selected={u.selected} locked={u.locked} submit={u.submit} />
          </View>
        </ScrollView>
      )}
      {u.overlayVisible ? (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Round Over</Text>
          <Text style={styles.overlayText}>Correct answer: {u.lastCorrectAnswer}</Text>
          <Text style={styles.overlayText}>
            {u.myScore === u.oppScore ? "Tie round" : u.myScore > u.oppScore ? "You lead" : "Opponent leads"}
          </Text>
          <Text style={styles.overlayText}>Score: {u.myScore} - {u.oppScore}</Text>
        </View>
      ) : null}
      {u.connectionLost ? (
        <View style={styles.overlay}><Text style={styles.overlayTitle}>Connection lost — reconnecting…</Text></View>
      ) : null}
    </SafeAreaView>
  );
}
