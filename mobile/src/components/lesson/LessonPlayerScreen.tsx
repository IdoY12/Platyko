import { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { isDraftReady } from "./answerDraft";
import { answerIsCode, correctAnswerText, feedbackMessage } from "./lessonAnswerText";
import { ConceptCardView } from "./ConceptCardView";
import { ExecutionPlayer } from "./execution-player/ExecutionPlayer";
import { FeedbackSheet } from "./FeedbackSheet";
import { HintPanel } from "./HintPanel";
import { ItemAnswerArea } from "./ItemAnswerArea";
import { useLessonPlayer } from "./useLessonPlayer";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { ProgressSegments } from "@/components/common/ProgressSegments/ProgressSegments";
import { useAppSelector } from "@/redux/hooks";
import ContentService from "@/services/auth-aware/ContentService";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, SCREEN_MARGIN, space } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/rootNavigation.types";

type Props = NativeStackScreenProps<RootStackParamList, "LessonPlayer">;

/**
 * A lesson (PRD 16.3, 16.4): the progress bar, the concept card, then each item with its answer
 * input, hints and a "Check" button; the feedback sheet after checking; the execution player on
 * request. There is no timer, and the mascot appears only in the feedback sheet, never while an
 * item is being answered (PRD 13.5).
 */
export function LessonPlayerScreen({ route, navigation }: Props) {
  const { lessonId } = route.params;
  const player = useLessonPlayer(lessonId);
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const [runOpen, setRunOpen] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const { item, slot, draft, checked } = player;

  const goToSummary = (result: ReturnType<typeof player.proceed>) => {
    if (result) navigation.replace("LessonSummary", { lessonId, ...result });
  };
  const leave = () => {
    player.leave();
    navigation.goBack();
  };
  const check = async () => {
    try {
      await player.check();
    } catch {
      setOfflineNotice(true);
    }
  };

  if (player.load.status !== "ready") {
    return (
      <SafeAreaView style={styles.centered}>
        {player.load.status === "loading" ? (
          <ActivityIndicator color={palette.brand.primary} />
        ) : (
          <View style={styles.errorBox}>
            <AppText align="center">{t("lesson.loadFailed")}</AppText>
            <OutlineButton label={t("common.back")} onPress={() => navigation.goBack()} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t("lesson.close")} onPress={leave} hitSlop={space.md} style={styles.close}>
          <MaterialCommunityIcons name="close" size={26} color={palette.text.secondary} />
        </PressableScale>
        <ProgressSegments total={player.progress.total} completed={player.progress.completed} accessibilityLabel={t("lesson.progress", { current: Math.min(player.progress.completed + 1, player.progress.total), total: player.progress.total })} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {slot?.kind === "conceptCard" && player.conceptCard ? <ConceptCardView card={player.conceptCard.card} /> : null}
        {item && draft ? (
          <>
            <ItemAnswerArea item={item} draft={draft} checked={checked} review={slot?.kind === "item" && slot.review} outputLines={player.outputLines} onDraftChange={player.setDraft} />
            {!checked && !player.isTest ? <HintPanel hints={item.hints} opened={player.hintsOpened} disabled={false} onOpenNext={player.openHint} /> : null}
            {offlineNotice ? (
              <View style={styles.notice}>
                <AppText color={palette.text.secondary}>{t("lesson.offlineCodeWrite")}</AppText>
                <OutlineButton label={t("lesson.skip")} onPress={() => { setOfflineNotice(false); goToSummary(player.skipItem()); }} />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {!checked ? (
        <View style={styles.footer}>
          {slot?.kind === "conceptCard" ? (
            <LipButton label={t("lesson.start")} onPress={() => goToSummary(player.proceed())} />
          ) : (
            <LipButton
              label={player.judging ? t("answer.checking") : t("lesson.check")}
              loading={player.judging}
              disabled={!item || !draft || !isDraftReady(item, draft)}
              onPress={() => void check()}
            />
          )}
        </View>
      ) : null}

      {checked && item ? (
        <FeedbackSheet
          outcome={checked.outcome}
          message={feedbackMessage(item, checked)}
          correctAnswer={checked.outcome === "reveal" ? correctAnswerText(item) : null}
          answerIsCode={answerIsCode(item)}
          mood={player.mood}
          canShowRun={Boolean(item.trace) && checked.outcome !== "retry"}
          canGiveFeedback={!isGuest}
          onPrimary={() => goToSummary(player.proceed())}
          onHint={() => {
            player.openHint();
            goToSummary(player.proceed());
          }}
          onSeeItRun={() => setRunOpen(true)}
          onVote={(vote) => void new ContentService().sendItemFeedback(item.id, { vote }).catch(() => undefined)}
          onReport={(reportReason) => void new ContentService().sendItemFeedback(item.id, { reportReason }).catch(() => undefined)}
        />
      ) : null}

      <Modal visible={runOpen && Boolean(item?.trace)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRunOpen(false)}>
        <SafeAreaView style={styles.root}>
          <View style={styles.header}>
            <PressableScale accessibilityRole="button" accessibilityLabel={t("player.close")} onPress={() => setRunOpen(false)} hitSlop={space.md} style={styles.close}>
              <MaterialCommunityIcons name="close" size={26} color={palette.text.secondary} />
            </PressableScale>
            <AppText variant="cardTitle" accessibilityRole="header">
              {t("player.title")}
            </AppText>
          </View>
          <ScrollView contentContainerStyle={styles.content}>{item?.trace ? <ExecutionPlayer trace={item.trace} /> : null}</ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg.base },
  centered: { flex: 1, backgroundColor: palette.bg.base, alignItems: "center", justifyContent: "center", padding: SCREEN_MARGIN },
  errorBox: { gap: space.lg, alignItems: "stretch" },
  header: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: SCREEN_MARGIN, paddingVertical: space.md },
  close: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: SCREEN_MARGIN, paddingBottom: 320, gap: space.lg },
  notice: { gap: space.md },
  footer: { paddingHorizontal: SCREEN_MARGIN, paddingTop: space.md, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line.subtle, backgroundColor: palette.bg.base },
});
