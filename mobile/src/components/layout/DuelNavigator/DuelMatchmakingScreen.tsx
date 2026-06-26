import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/redux/hooks";
import { useDuelMatchmakingSocket } from "@/hooks/useDuelSocket";
import { duelQueueRejectMessage } from "@/utils/formatHelpers";
import { logDuel, logNav } from "@/utils/logger";
import { duelLeaveDuel } from "@/utils/duelSocketCommands";
import type { MatchmakingScreenProps } from "@/types/duelNavigation.types";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { colors } from "@/theme/theme";
import { styles } from "./DuelNavigator.styles";

const QUEUE_TIMER_INTERVAL_MS = 1000;
const MATCH_COUNTDOWN_TICK_MS = 700;

export function DuelMatchmakingScreen({ navigation }: MatchmakingScreenProps) {
  const { playersOnline, sessionId, opponent, joinQueue, leaveQueue, queueRejected } = useDuelMatchmakingSocket();
  const userId = useAppSelector((s) => s.session.userId);
  const username = useAppSelector((s) => s.profile.username);
  const accessToken = useAppSelector((s) => s.session.accessToken);
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const hasJoinedQueueRef = useRef(false);
  const usernameRef = useRef(username);
  const accessTokenRef = useRef(accessToken);
  const sessionIdRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => { usernameRef.current = username; accessTokenRef.current = accessToken; sessionIdRef.current = sessionId; }, [username, accessToken, sessionId]);
  useEffect(() => { logNav("screen:enter", { screen: "MatchmakingScreen" }); return () => logNav("screen:leave", { screen: "MatchmakingScreen" }); }, []);
  useEffect(() => { if (sessionId) return; const i = setInterval(() => setSeconds((v) => v + 1), QUEUE_TIMER_INTERVAL_MS); return () => clearInterval(i); }, [sessionId]);
  useEffect(() => {
    if (!userId || !accessTokenRef.current || hasJoinedQueueRef.current || queueRejected) return;
    hasJoinedQueueRef.current = true;
    joinQueue({ userId, username: usernameRef.current, token: accessTokenRef.current });
    logDuel("queue:join", { userId });
    return () => { if (!navigatedRef.current) { logDuel("queue:leave", { userId: userId ?? "unknown" }); sessionIdRef.current ? duelLeaveDuel(sessionIdRef.current) : leaveQueue(); } hasJoinedQueueRef.current = false; };
  }, [joinQueue, leaveQueue, userId, queueRejected]);
  useEffect(() => {
    if (!sessionId || !opponent) return undefined;
    const timer = setInterval(() => setCountdown((value) => Math.max(0, value - 1)), MATCH_COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [sessionId, opponent]);
  useEffect(() => { if (sessionId && opponent && countdown === 0 && !navigatedRef.current) { navigatedRef.current = true; navigation.replace("ActiveDuel"); } }, [countdown, navigation, opponent, sessionId]);

  if (queueRejected) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Text style={styles.sub}>{duelQueueRejectMessage(queueRejected)}</Text>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryLabel}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Text style={styles.searching}>Searching for an opponent...</Text>
      <View style={styles.subRow}>
        <AppIcon name="lightning-bolt" size={16} color={colors.textSecondary} />
        <Text style={[styles.sub, styles.subRowLabel]}>{playersOnline === 1 ? "1 player" : `${playersOnline} players`} online</Text>
      </View>
      <Text style={styles.sub}>Estimated wait: {seconds}s</Text>
      {opponent ? (
        <View style={styles.matchOppRow}>
          {opponent.avatarUrl ? (
            <Image source={{ uri: opponent.avatarUrl }} style={styles.matchOppAvatar} />
          ) : (
            <View style={styles.matchOppInitial}>
              <Text style={styles.matchOppInitialTxt}>{(opponent.username || "?").slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.vsInline}>VS {opponent.username} · {countdown}</Text>
        </View>
      ) : null}
      <Pressable style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryLabel}>Cancel</Text>
      </Pressable>
    </SafeAreaView>
  );
}
