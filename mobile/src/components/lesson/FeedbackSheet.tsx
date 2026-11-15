import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { SlideInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { AttemptOutcome } from "@project/learning-logic";
import type { ItemReportReason } from "@project/api-contract";
import { ITEM_REPORT_REASONS } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { ContentText } from "@/components/common/AppText/ContentText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Mascot } from "@/components/mascot/Mascot";
import { ExplainMistake } from "./ExplainMistake";
import { t } from "@/i18n/translate";
import { bottomSheet, duration, palette, radii, space, springs, wash } from "@/theme/tokens";

type Props = {
  outcome: AttemptOutcome;
  /** Correct: why it is right. Retry: the chosen mistake explained. Reveal: the full explanation. */
  message: string;
  /** Reveal only: the right answer, shown on the back of the flipping card. */
  correctAnswer: string | null;
  answerIsCode: boolean;
  /** The learner's recent run of answers, -1 to 1, for the mascot's reaction. */
  mood: number;
  canShowRun: boolean;
  /** Registered learners can vote and report. */
  canGiveFeedback: boolean;
  onPrimary: () => void;
  onHint: () => void;
  onSeeItRun: () => void;
  onVote: (vote: 1 | -1) => void;
  onReport: (reason: ItemReportReason) => void;
  /** A wrong `CODE_WRITE` answer by a registered learner: a live explanation may be asked for. */
  explainMistake?: () => Promise<string | null>;
  /** A `FIX_BUG` item: on a retry, the sheet's hint is the moment the mascot senses the bug. */
  bugHunt: boolean;
};

const TITLE_KEY = { correct: "feedback.correctTitle", retry: "feedback.almostTitle", reveal: "feedback.revealTitle" } as const;
const MASCOT_STATE = { correct: "cheer", retry: "idle", reveal: "comfort" } as const;
const TONE = { correct: palette.state.success, retry: palette.brand.js, reveal: palette.brand.glow } as const;

/** The answer card turns over to show the right answer (PRD 12.8): a 3D flip that says "the other side". */
function FlipCard({ answer, isCode }: { answer: string; isCode: boolean }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.set(withDelay(duration.transition, withTiming(1, { duration: duration.emphasis })));
  }, [turn]);
  const front = useAnimatedStyle(() => ({ opacity: turn.get() < 0.5 ? 1 : 0, transform: [{ perspective: 800 }, { rotateY: `${turn.get() * 180}deg` }] }));
  const back = useAnimatedStyle(() => ({ opacity: turn.get() < 0.5 ? 0 : 1, transform: [{ perspective: 800 }, { rotateY: `${turn.get() * 180 - 180}deg` }] }));
  return (
    <View style={styles.flip} accessible accessibilityLabel={`${t("feedback.correctAnswer")}: ${answer}`}>
      <Animated.View style={[styles.flipFace, styles.flipFront, front]}>
        <MaterialCommunityIcons name="help" size={28} color={palette.text.muted} />
      </Animated.View>
      <Animated.View style={[styles.flipFace, styles.flipBack, back]}>
        <AppText variant="label" color={palette.brand.glow}>
          {t("feedback.correctAnswer")}
        </AppText>
        <AppText variant={isCode ? "code" : "bodyStrong"} align={isCode ? "ltr" : "start"}>
          {answer}
        </AppText>
      </Animated.View>
    </View>
  );
}

/** The sheet that rises after "Check" (PRD 16.4). The mascot sits small in the corner; the screen above stays visible. */
export function FeedbackSheet(props: Props) {
  const { outcome, message, correctAnswer, answerIsCode, mood, canShowRun, canGiveFeedback } = props;
  const [reporting, setReporting] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [thinking, setThinking] = useState(false);
  // PRD 13.4: `think` while an explanation is on its way, `sense` at a bug-fix item's hint.
  const mascotState = thinking ? "think" : outcome === "retry" && props.bugHunt ? "sense" : MASCOT_STATE[outcome];

  return (
    <Animated.View entering={SlideInDown.springify().duration(springs.sheet.duration).dampingRatio(springs.sheet.dampingRatio)} style={[styles.sheet, { borderTopColor: TONE[outcome] }]} accessibilityViewIsModal>
      <View style={styles.header}>
        <View style={styles.mascot}>
          <Mascot state={mascotState} streakLength={0} mood={mood} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="cardTitle" color={TONE[outcome]} accessibilityRole="header" accessibilityLiveRegion="assertive">
            {t(TITLE_KEY[outcome])}
          </AppText>
        </View>
      </View>
      {outcome === "reveal" && correctAnswer !== null ? <FlipCard answer={correctAnswer} isCode={answerIsCode} /> : null}
      {message ? <ContentText>{message}</ContentText> : null}
      {props.explainMistake && outcome !== "correct" ? <ExplainMistake explain={props.explainMistake} onThinkingChange={setThinking} /> : null}

      {canGiveFeedback && outcome !== "retry" && !feedbackGiven ? (
        <View style={styles.feedbackRow}>
          <PressableScale accessibilityRole="button" accessibilityLabel={t("lesson.voteHelpful")} onPress={() => { props.onVote(1); setFeedbackGiven(true); }} style={styles.iconButton}>
            <MaterialCommunityIcons name="thumb-up-outline" size={20} color={palette.text.secondary} />
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel={t("lesson.voteNotHelpful")} onPress={() => { props.onVote(-1); setFeedbackGiven(true); }} style={styles.iconButton}>
            <MaterialCommunityIcons name="thumb-down-outline" size={20} color={palette.text.secondary} />
          </PressableScale>
          <PressableScale accessibilityRole="button" accessibilityLabel={t("lesson.reportProblem")} onPress={() => setReporting((value) => !value)} style={styles.iconButton}>
            <MaterialCommunityIcons name="flag-outline" size={20} color={palette.text.secondary} />
          </PressableScale>
        </View>
      ) : null}
      {reporting && !feedbackGiven ? (
        <View style={styles.reasons}>
          {ITEM_REPORT_REASONS.map((reason) => (
            <OutlineButton key={reason} label={t(`lesson.reportReason.${reason}`)} onPress={() => { props.onReport(reason); setFeedbackGiven(true); setReporting(false); }} />
          ))}
        </View>
      ) : null}
      {feedbackGiven ? (
        <AppText variant="label" color={palette.text.muted}>
          {t("lesson.reportSent")}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {outcome === "retry" ? (
          <OutlineButton label={t("lesson.hint")} onPress={props.onHint} style={styles.action} />
        ) : canShowRun ? (
          <OutlineButton label={t("lesson.seeItRun")} onPress={props.onSeeItRun} style={styles.action} />
        ) : null}
        <LipButton label={outcome === "retry" ? t("lesson.tryAgain") : t("lesson.continue")} tone={outcome === "correct" ? "success" : "primary"} onPress={props.onPrimary} style={styles.action} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: bottomSheet,
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  mascot: { width: 64 },
  headerText: { flex: 1 },
  flip: { height: 96 },
  flipFace: { ...StyleSheet.absoluteFillObject, borderRadius: radii.button, padding: space.md, justifyContent: "center", backfaceVisibility: "hidden" },
  flipFront: { alignItems: "center", backgroundColor: palette.bg.surface },
  flipBack: { gap: space.xs, backgroundColor: wash.glow, borderWidth: 1, borderColor: palette.brand.glow },
  feedbackRow: { flexDirection: "row", gap: space.sm },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.pill, backgroundColor: palette.bg.surface },
  reasons: { gap: space.sm },
  actions: { flexDirection: "row", gap: space.md, marginTop: space.sm },
  action: { flex: 1 },
});
