import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { MatchStartEvent, RoundStartEvent } from "@project/api-contract";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { ItemAnswerArea } from "@/components/lesson/ItemAnswerArea";
import { draftToAnswer, emptyDraft, isDraftReady, shuffledOutputLines } from "@/components/lesson/answerDraft";
import type { CheckedAnswer } from "@/components/lesson/useLessonPlayer";
import { t } from "@/i18n/translate";
import { useAppSelector } from "@/redux/hooks";
import { playService } from "@/services/playSocket";
import { palette, radii, space, wash } from "@/theme/tokens";
import { itemOfPlay } from "./playItemView";
import { usePlayClock } from "./usePlayClock";

const NOT_CHECKED = { optionIndex: null, wrongLine: false, codeVerdict: null } as const;

/**
 * One round (PRD 11.4–11.7): the item, a countdown from the server's deadline, who has answered
 * (never whether they were right) and two tries. Once the round ends the item shows the revealed
 * option; PlayMatch adds the standings. Mounted afresh for every round.
 */
export function PlayRound({ match, round }: { match: MatchStartEvent; round: RoundStartEvent }) {
  const { progress, lastAnswer, roundEnd } = useAppSelector((state) => state.play);
  const ended = roundEnd?.round === round.round ? roundEnd : null;
  const item = useMemo(() => itemOfPlay(round.item, match.track, ended?.rightOptionIndex ?? null), [round.item, match.track, ended]);
  const outputLines = useMemo(() => shuffledOutputLines(item), [item]);
  // The empty input depends only on the item's shape, which the round's end does not change.
  const blankDraft = useMemo(() => emptyDraft(itemOfPlay(round.item, match.track, null)), [round.item, match.track]);
  const [draft, setDraft] = useState(blankDraft);
  const [waiting, setWaiting] = useState(false);
  const result = lastAnswer?.round === round.round ? lastAnswer : null;
  const bugHunt = match.variant === "bug-hunt";
  const ready = bugHunt && draft.kind === "bugFix" ? draft.line !== null : isDraftReady(item, draft);
  const remainingMs = usePlayClock(round.endsAt, round.item.timeLimitSec * 1000);

  // A first wrong answer clears the input for the second try.
  useEffect(() => {
    setWaiting(false);
    if (result?.outcome === "retry") setDraft(blankDraft);
  }, [result, blankDraft]);

  const finalOutcome = result && result.outcome !== "retry" ? result.outcome : null;
  const checked: CheckedAnswer | null =
    finalOutcome === "correct" ? { ...NOT_CHECKED, outcome: "correct", correct: true } : finalOutcome || ended ? { ...NOT_CHECKED, outcome: ended ? "reveal" : "retry", correct: false } : null;
  const answer = () => {
    // Bug Hunt is judged on the tapped line alone (PRD 11.10).
    const built = bugHunt && draft.kind === "bugFix" ? { kind: "bugFix" as const, line: draft.line ?? 0, optionIndex: null } : draftToAnswer(item, draft);
    if (!built) return;
    setWaiting(true);
    playService.answer({ matchId: match.matchId, round: round.round, answer: built });
  };
  const answered = new Set(progress?.round === round.round ? progress.answeredUserIds : []);

  return (
    <View style={styles.round}>
      <View style={styles.timerTrack} accessible accessibilityRole="timer" accessibilityLabel={`${Math.ceil(remainingMs / 1000)}`}>
        <View style={[styles.timerFill, { width: `${(remainingMs / (round.item.timeLimitSec * 1000)) * 100}%` }]} />
      </View>
      <View style={styles.seats}>
        {match.seats.map((seat) => (
          <View key={seat.userId} style={[styles.seat, answered.has(seat.userId) && styles.seatAnswered]}>
            <AppText variant="label" align="ltr" numberOfLines={1} color={answered.has(seat.userId) ? palette.text.primary : palette.text.muted}>
              {seat.username}
            </AppText>
            {answered.has(seat.userId) ? <AppText variant="label" color={palette.brand.glow}>{t("play.answered")}</AppText> : null}
          </View>
        ))}
      </View>

      <ItemAnswerArea item={item} draft={draft} checked={checked} review={false} outputLines={outputLines} onDraftChange={setDraft} />

      {result?.outcome === "retry" && !ended ? <AppText color={palette.brand.js}>{t("play.retry")}</AppText> : null}
      {finalOutcome === "correct" ? <AppText variant="cardTitle" color={palette.state.success}>{t("play.points", { points: result?.points ?? 0 })}
          {result?.responseMs != null ? ` · ${t("play.answerTime", { seconds: (result.responseMs / 1000).toFixed(1) })}` : ""}</AppText> : null}
      {finalOutcome === "wrong" ? <AppText color={palette.text.secondary}>{t("play.wrong")}</AppText> : null}
      {!checked ? <LipButton label={t("lesson.check")} disabled={!ready || remainingMs === 0} loading={waiting} onPress={answer} /> : null}

    </View>
  );
}

const styles = StyleSheet.create({
  round: { gap: space.lg },
  timerTrack: { height: 8, borderRadius: radii.pill, backgroundColor: palette.bg.raised, overflow: "hidden" },
  timerFill: { height: 8, borderRadius: radii.pill, backgroundColor: palette.brand.primary },
  seats: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  seat: { flexDirection: "row", gap: space.xs, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, backgroundColor: palette.bg.surface },
  seatAnswered: { backgroundColor: wash.glow },
});
