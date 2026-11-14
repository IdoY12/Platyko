import { useMemo, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { applyAttempt, EMPTY_PROGRESS } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Surface } from "@/components/common/Surface/Surface";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { applyServerProgress, clearGuestHistory } from "@/redux/learning-slice";
import ProgressService from "@/services/auth-aware/ProgressService";
import { t } from "@/i18n/translate";
import { palette, space, wash } from "@/theme/tokens";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

/**
 * Shown once after a guest signs in by any method while the device still holds guest progress
 * (PRD 10.2): "We found progress on this device. Add it to your account?". Accepting sends the
 * attempts, never numbers; the server merges them and returns the account's progress.
 */
export function GuestMergePrompt() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.session.isAuthenticated);
  const history = useAppSelector((state) => state.learning.guestHistory);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // The same rules as the server give the numbers to show; the concept does not matter for them.
  const summary = useMemo(() => {
    const replayed = history.attempts.reduce((progress, attempt) => applyAttempt(progress, attempt, attempt.itemId, attempt.answeredAt.slice(0, 10)).snapshot, EMPTY_PROGRESS);
    return { items: new Set(history.attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.itemId)).size, streak: replayed.streak.current };
  }, [history.attempts]);

  const visible = isAuthenticated && history.attempts.length > 0;

  const accept = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const response = await new ProgressService().mergeGuestHistory({ clientLocalDate: getStreakCalendarDate(), attempts: history.attempts, completedLessons: history.lessons, dailyChallenges: history.dailyChallenges });
      dispatch(applyServerProgress({ response, sentAttemptIds: [], sentLessonIds: [], sentChallengeDates: [] }));
      dispatch(clearGuestHistory());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => dispatch(clearGuestHistory())}>
      <View style={styles.scrim}>
        <Surface level="raised" style={styles.card}>
          <AppText variant="cardTitle" accessibilityRole="header">
            {t("merge.title")}
          </AppText>
          <AppText color={palette.text.secondary}>{t("merge.body", { items: summary.items, streak: summary.streak })}</AppText>
          {failed ? <AppText color={palette.state.danger}>{t("merge.failed")}</AppText> : null}
          <LipButton label={t("merge.accept")} loading={busy} onPress={() => void accept()} />
          <OutlineButton label={t("merge.decline")} disabled={busy} onPress={() => dispatch(clearGuestHistory())} />
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "center", padding: space.xl, backgroundColor: wash.scrim },
  card: { gap: space.lg },
});
