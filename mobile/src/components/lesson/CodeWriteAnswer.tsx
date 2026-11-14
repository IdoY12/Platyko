import { useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from "react-native";
import type { Item } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { t } from "@/i18n/translate";
import { haptic } from "@/theme/haptics";
import { MIN_TOUCH_TARGET, palette, radii, space, syntax, typography } from "@/theme/tokens";
import { LtrView } from "@/components/common/AppText/LtrView";

type Props = {
  item: Item;
  source: string;
  disabled: boolean;
  verdict: "correct" | "wrong" | null;
  onChange: (source: string) => void;
};

/** Punctuation that is slow to reach on a phone keyboard (PRD 12.5). */
const SYMBOL_TOKENS = ["{", "}", "(", ")", "[", "]", ";", "=", "=>", "'", '"', ".", ",", "+", "<", ">", "!"];
const KEYWORD_TOKENS = ["return", "const", "let", "if", "for", "of", "===", "&&", "||"];
const MAX_UNDO_STEPS = 50;

/** Names the learner will need: the entry's parameters or variables, and identifiers from the snippet. */
function identifierTokens(item: Item): string[] {
  const entry = item.solution.entry;
  const fromEntry = entry ? (entry.kind === "function" ? entry.params : entry.variables) : [];
  const fromCode = (item.code ?? []).join("\n").match(/[A-Za-z_$][\w$]*/g) ?? [];
  return [...new Set([...fromEntry, ...fromCode])].filter((name) => name.length > 1 && !KEYWORD_TOKENS.includes(name)).slice(0, 8);
}

/**
 * `CODE_WRITE`: a code field that always types Latin, left to right, with no autocorrect, and a
 * bar of tokens that insert at the cursor, a delete key, cursor moves and undo. Beginners see
 * keywords too, so most answers can be built without the system keyboard.
 */
export function CodeWriteAnswer({ item, source, disabled, verdict, onChange }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: source.length, end: source.length });
  const [history, setHistory] = useState<string[]>([]);
  const tokens = useMemo(
    () => [...identifierTokens(item), ...(item.track === "BEGINNER" ? KEYWORD_TOKENS : []), ...SYMBOL_TOKENS],
    [item],
  );

  const replaceSelection = (text: string, cursorOffset = text.length) => {
    const next = source.slice(0, selection.start) + text + source.slice(selection.end);
    setHistory((previous) => [...previous.slice(-MAX_UNDO_STEPS + 1), source]);
    onChange(next);
    const cursor = selection.start + cursorOffset;
    setSelection({ start: cursor, end: cursor });
  };

  const moveCursor = (delta: number) => {
    const cursor = Math.max(0, Math.min(source.length, selection.start + delta));
    setSelection({ start: cursor, end: cursor });
  };

  const deleteBack = () => {
    if (selection.start !== selection.end) return replaceSelection("");
    if (selection.start === 0) return;
    setHistory((previous) => [...previous.slice(-MAX_UNDO_STEPS + 1), source]);
    onChange(source.slice(0, selection.start - 1) + source.slice(selection.end));
    setSelection({ start: selection.start - 1, end: selection.start - 1 });
  };

  const undo = () => {
    const previous = history.at(-1);
    if (previous === undefined) return;
    setHistory(history.slice(0, -1));
    onChange(previous);
    setSelection({ start: previous.length, end: previous.length });
  };

  const border = verdict === "correct" ? palette.state.success : verdict === "wrong" ? palette.state.danger : palette.line.strong;
  const key = (label: string, accessibilityLabel: string, onPress: () => void) => (
    <PressableScale
      key={accessibilityLabel}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={styles.token}
    >
      <AppText variant="code" align="ltr" color={syntax.plain}>
        {label}
      </AppText>
    </PressableScale>
  );

  return (
    <LtrView style={styles.wrapper}>
      <TextInput
        ref={inputRef}
        value={source}
        onChangeText={(text) => {
          setHistory((previous) => [...previous.slice(-MAX_UNDO_STEPS + 1), source]);
          onChange(text);
        }}
        selection={selection}
        onSelectionChange={(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => setSelection(event.nativeEvent.selection)}
        editable={!disabled}
        multiline
        accessibilityLabel={t("answer.codeInput")}
        placeholder={t("answer.writeCode")}
        placeholderTextColor={palette.text.muted}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        // Forces a Latin keyboard even when the interface is in Hebrew (PRD 12.5).
        keyboardType="ascii-capable"
        smartInsertDelete={false}
        textAlign="left"
        style={[styles.input, typography.code, { borderColor: border }]}
      />
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bar}>
        {key("⌫", t("answer.deleteToken"), deleteBack)}
        {key("◀", t("answer.cursorLeft"), () => moveCursor(-1))}
        {key("▶", t("answer.cursorRight"), () => moveCursor(1))}
        {key("↶", t("answer.undo"), undo)}
        {tokens.map((token) => key(token, token, () => replaceSelection(/^[A-Za-z]/.test(token) && token.length > 2 ? `${token} ` : token)))}
      </ScrollView>
    </LtrView>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.md },
  input: {
    minHeight: 140,
    maxHeight: 260,
    padding: space.md,
    color: syntax.plain,
    backgroundColor: palette.bg.code,
    borderRadius: radii.card,
    borderWidth: 2,
    textAlignVertical: "top",
    writingDirection: "ltr",
  },
  bar: { gap: space.sm, paddingVertical: space.xs },
  token: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: space.md,
    borderRadius: radii.chip,
    backgroundColor: palette.bg.raised,
    borderWidth: 1,
    borderColor: palette.line.subtle,
  },
});
