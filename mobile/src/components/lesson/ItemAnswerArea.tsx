import { StyleSheet, View } from "react-native";
import type { Item } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { ContentText } from "@/components/common/AppText/ContentText";
import { CodeView } from "@/components/common/CodeView/CodeView";
import { t } from "@/i18n/translate";
import { palette, radii, space, wash } from "@/theme/tokens";
import type { AnswerDraft } from "./answerDraft";
import { BlankChips } from "./BlankChips";
import { CodeWriteAnswer } from "./CodeWriteAnswer";
import { FixBugAnswer } from "./FixBugAnswer";
import { LineOrderBoard } from "./LineOrderBoard";
import { OptionList, type OptionVerdict } from "./OptionList";
import type { CheckedAnswer } from "./useLessonPlayer";

type Props = {
  item: Item;
  draft: AnswerDraft;
  checked: CheckedAnswer | null;
  review: boolean;
  outputLines: readonly string[];
  onDraftChange: (draft: AnswerDraft) => void;
};

/** Formats whose snippet is shown above the answer (the others draw the code inside their own input). */
const SHOWS_CODE_ABOVE: ReadonlySet<Item["format"]> = new Set(["PREDICT_OUTPUT", "TRACE", "CONCEPT_MCQ", "CODE_WRITE"]);

function optionVerdicts(item: Item, checked: CheckedAnswer | null, selected: number | null): Partial<Record<number, OptionVerdict>> {
  if (!checked || selected === null) return {};
  const verdicts: Partial<Record<number, OptionVerdict>> = { [selected]: checked.correct ? "correct" : "wrong" };
  if (checked.outcome === "reveal") {
    const right = item.options?.findIndex((option) => option.correct) ?? -1;
    if (right !== -1) verdicts[right] = "correct";
  }
  return verdicts;
}

/** One item: its prompt, its code and the answer input of its format (PRD 6.3). */
export function ItemAnswerArea({ item, draft, checked, review, outputLines, onDraftChange }: Props) {
  const locked = checked !== null;
  const verdict = checked ? (checked.correct ? "correct" : "wrong") : null;
  const showOrderOutputCode = item.format === "PARSONS" && item.variant === "ORDER_OUTPUT";

  return (
    <View style={styles.area}>
      {review ? (
        <View style={styles.reviewBadge}>
          <AppText variant="label" color={palette.brand.glow}>
            {t("lesson.reviewBadge")}
          </AppText>
        </View>
      ) : null}
      <ContentText variant="cardTitle">{item.prompt}</ContentText>
      {(SHOWS_CODE_ABOVE.has(item.format) || showOrderOutputCode) && item.code ? <CodeView lines={item.code} /> : null}

      {draft.kind === "option" ? (
        <OptionList
          options={(item.options ?? []).map((option) => option.text)}
          selectedIndex={draft.optionIndex}
          verdicts={optionVerdicts(item, checked, draft.optionIndex)}
          optionsAreCode={item.format !== "CONCEPT_MCQ"}
          disabled={locked}
          onSelect={(optionIndex) => onDraftChange({ kind: "option", optionIndex })}
        />
      ) : null}
      {draft.kind === "order" ? (
        <LineOrderBoard lines={item.code ?? []} placed={draft.placed} linesAreCode disabled={locked} verdict={verdict} onChange={(placed) => onDraftChange({ kind: "order", placed })} />
      ) : null}
      {draft.kind === "outputOrder" ? (
        <LineOrderBoard lines={outputLines} placed={draft.placed} linesAreCode={false} disabled={locked} verdict={verdict} onChange={(placed) => onDraftChange({ kind: "outputOrder", placed })} />
      ) : null}
      {draft.kind === "blanks" ? (
        <BlankChips
          code={item.code ?? []}
          chips={(item.options ?? []).map((option) => option.text)}
          filled={draft.filled}
          activeBlank={draft.activeBlank}
          disabled={locked}
          verdict={verdict}
          onChange={(filled, activeBlank) => onDraftChange({ kind: "blanks", filled, activeBlank })}
        />
      ) : null}
      {draft.kind === "bugFix" ? (
        <FixBugAnswer
          item={item}
          line={draft.line}
          optionIndex={draft.optionIndex}
          disabled={locked}
          lineVerdict={checked ? (checked.wrongLine ? "wrong" : "correct") : null}
          optionVerdicts={checked && !checked.wrongLine ? optionVerdicts(item, checked, draft.optionIndex) : {}}
          onChange={(line, optionIndex) => onDraftChange({ kind: "bugFix", line, optionIndex })}
        />
      ) : null}
      {draft.kind === "code" ? <CodeWriteAnswer item={item} source={draft.source} disabled={locked} verdict={verdict} onChange={(source) => onDraftChange({ kind: "code", source })} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { gap: space.lg },
  reviewBadge: { alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, backgroundColor: wash.glow },
});
