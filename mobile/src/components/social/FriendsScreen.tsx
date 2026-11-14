import { useCallback, useEffect, useState } from "react";
import { Alert, Share, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { SEARCH_MIN_LENGTH, type FriendsResponse, type PublicUser } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { TextButton } from "@/components/common/LipButton/TextButton";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { Surface } from "@/components/common/Surface/Surface";
import { TextField } from "@/components/common/TextField/TextField";
import { localizedError } from "@/i18n/localizedMessage";
import { t } from "@/i18n/translate";
import SocialService from "@/services/auth-aware/SocialService";
import { palette, space, typography } from "@/theme/tokens";
import type { RootNavigation, RootStackParamList } from "@/types/rootNavigation.types";
import { logError } from "@/utils/logger";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { UserRow } from "./UserRow";
import QRCode from "react-native-qrcode-svg";
import { friendLink } from "@/config/appLinks";
import { useInviteToDuel } from "@/components/play/useInviteToDuel";
import { useAppSelector } from "@/redux/hooks";
import type { PresenceStatus } from "@project/api-contract";

const SEARCH_DELAY_MS = 300;
const QR_SIZE = 160;

/**
 * Friends (PRD 11.1): your code to share, search, add by code, requests both ways, the list by
 * presence with duel invitations, and the people you played recently.
 */
export function FriendsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [friends, setFriends] = useState<FriendsResponse | null>(null);
  const [recent, setRecent] = useState<PublicUser[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[] | null>(null);
  const route = useRoute<RouteProp<RootStackParamList, "Friends">>();
  const [code, setCode] = useState(route.params?.friendCode ?? "");
  const open = (user: PublicUser) => navigation.navigate("UserProfile", { username: user.username });
  const presence = useAppSelector((state) => state.play.presence);
  const inviteToDuel = useInviteToDuel();

  const reload = useCallback(() => {
    new SocialService().getFriends(getStreakCalendarDate()).then(setFriends, (error: unknown) => logError("[SOCIAL]", error, { phase: "load-friends" }));
    new SocialService().getRecentOpponents().then(setRecent, (error: unknown) => logError("[SOCIAL]", error, { phase: "load-recent" }));
  }, []);
  useFocusEffect(reload);

  // Searches a moment after typing stops; fewer than three letters show the hint instead.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => void new SocialService().search(trimmed).then(setResults, () => setResults([])), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const act = async (action: () => Promise<unknown>, done?: string) => {
    try {
      await action();
      if (done) Alert.alert(t("friends.title"), done);
      reload();
    } catch (error) {
      Alert.alert(t("friends.title"), localizedError(error));
    }
  };

  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("friends.title")} />
      {friends ? (
        <Surface style={styles.card}>
          <AppText variant="label" color={palette.text.secondary}>
            {t("friends.myCode")}
          </AppText>
          <AppText align="center" style={styles.code} accessibilityLabel={friends.friendCode.split("").join(" ")}>
            {friends.friendCode}
          </AppText>
          {/* Scanned by a friend's camera: opens the app on the friend link (PRD 11.1). */}
          <View style={styles.qr} accessible accessibilityLabel={t("friends.qr")}>
            <QRCode value={friendLink(friends.friendCode)} size={QR_SIZE} color={palette.bg.base} backgroundColor={palette.text.primary} quietZone={space.sm} />
          </View>
          <OutlineButton label={t("friends.shareCode")} onPress={() => void Share.share({ message: t("friends.shareMessage", { code: friends.friendCode, link: friendLink(friends.friendCode) }) })} />
        </Surface>
      ) : null}

      <View style={styles.group}>
        <TextField value={query} onChangeText={setQuery} placeholder={t("friends.search")} accessibilityLabel={t("friends.search")} autoCapitalize="none" autoCorrect={false} />
        {query.trim().length > 0 && results === null ? <AppText variant="label" color={palette.text.muted}>{t("friends.searchHint")}</AppText> : null}
        {results?.length === 0 ? <AppText color={palette.text.secondary}>{t("friends.noResults")}</AppText> : null}
        {results?.map((user) => <UserRow key={user.id} user={user} onOpen={() => open(user)} />)}
      </View>

      <View style={styles.group}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("friends.addByCode")}
        </AppText>
        <View style={styles.codeRow}>
          <TextField value={code} onChangeText={(text) => setCode(text.toUpperCase())} placeholder={t("friends.codePlaceholder")} accessibilityLabel={t("friends.addByCode")} autoCapitalize="characters" autoCorrect={false} maxLength={8} style={styles.codeField} />
          <OutlineButton label={t("friends.add")} disabled={code.length !== 8} onPress={() => void act(async () => {
            const outcome = await new SocialService().sendRequest({ friendCode: code });
            setCode("");
            return outcome;
          }, t("friends.requestSent"))} />
        </View>
      </View>

      {friends && friends.incoming.length > 0 ? (
        <Section title={t("friends.incoming")}>
          {friends.incoming.map((request) => (
            <UserRow key={request.id} user={request.user} onOpen={() => open(request.user)} actions={
              <View style={styles.actions}>
                <TextButton label={t("friends.accept")} onPress={() => void act(() => new SocialService().answerRequest(request.id, true), t("friends.nowFriends"))} />
                <TextButton label={t("friends.decline")} onPress={() => void act(() => new SocialService().answerRequest(request.id, false))} />
              </View>
            } />
          ))}
        </Section>
      ) : null}
      {friends && friends.outgoing.length > 0 ? (
        <Section title={t("friends.outgoing")}>
          {friends.outgoing.map((request) => (
            <UserRow key={request.id} user={request.user} onOpen={() => open(request.user)} actions={<TextButton label={t("friends.cancel")} onPress={() => void act(() => new SocialService().cancelRequest(request.id))} />} />
          ))}
        </Section>
      ) : null}
      {friends ? (
        <Section title={t("friends.list")}>
          {friends.friends.length === 0 ? <AppText color={palette.text.secondary}>{t("friends.empty")}</AppText> : null}
          {byPresence(friends.friends, presence).map((user) => (
            <UserRow key={user.id} user={user} onOpen={() => open(user)} actions={
              <View style={styles.actions}>
                {friends.streaks[user.id] !== undefined ? (
                  <View style={styles.streak} accessible accessibilityLabel={t("friends.streakDays", { days: friends.streaks[user.id] })}>
                    <MaterialCommunityIcons name="fire" size={16} color={palette.brand.primary} />
                    <AppText variant="label" color={palette.brand.primary}>
                      {friends.streaks[user.id]}
                    </AppText>
                  </View>
                ) : null}
                {presence[user.id] ? (
                  <AppText variant="label" color={presence[user.id] === "online" ? palette.state.success : palette.brand.glow}>
                    {t(`presence.${presence[user.id]}`)}
                  </AppText>
                ) : null}
                {presence[user.id] === "online" ? <TextButton label={t("play.invite")} onPress={() => inviteToDuel(user)} /> : null}
              </View>
            } />
          ))}
        </Section>
      ) : null}
      {recent.length > 0 ? (
        <Section title={t("friends.recent")}>
          {recent.map((user) => <UserRow key={user.id} user={user} onOpen={() => open(user)} />)}
        </Section>
      ) : null}
    </Screen>
  );
}

const PRESENCE_ORDER: Record<PresenceStatus, number> = { online: 0, "in-game": 1, offline: 2 };

/** Friends sorted by presence: online, in a game, offline (PRD 11.1); the server order breaks ties. */
function byPresence(users: PublicUser[], presence: Record<string, PresenceStatus>): PublicUser[] {
  return [...users].sort((left, right) => PRESENCE_ORDER[presence[left.id] ?? "offline"] - PRESENCE_ORDER[presence[right.id] ?? "offline"]);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="label" color={palette.text.secondary}>
        {title}
      </AppText>
      <Surface style={styles.card}>{children}</Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  card: { gap: space.md },
  group: { gap: space.md },
  code: { ...typography.code, fontSize: 28, lineHeight: 36, letterSpacing: 4, color: palette.brand.js },
  qr: { alignSelf: "center", borderRadius: space.sm, overflow: "hidden" },
  codeRow: { flexDirection: "row", gap: space.md, alignItems: "center" },
  codeField: { flex: 1, ...typography.code },
  actions: { flexDirection: "row", alignItems: "center", gap: space.sm },
  streak: { flexDirection: "row", alignItems: "center", gap: 2 },
});
