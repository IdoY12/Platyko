import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import type { ItemTrace } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { CodeView } from "@/components/common/CodeView/CodeView";
import { OutlineButton } from "@/components/common/LipButton/OutlineButton";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { duration, palette, radii, space, syntax } from "@/theme/tokens";

type Props = { trace: ItemTrace };

const SPEEDS_MS = [1400, 800, 400];

function QueueColumn({ title, entries }: { title: string; entries: readonly string[] }) {
  return (
    <View style={styles.queue} accessible accessibilityLabel={`${title}: ${entries.length === 0 ? t("player.empty") : entries.join(", ")}`}>
      <AppText variant="label" color={palette.text.secondary}>
        {title}
      </AppText>
      {entries.length === 0 ? (
        <AppText variant="codeSmall" color={palette.text.muted} align="ltr">
          —
        </AppText>
      ) : (
        entries.map((entry, index) => (
          <Animated.View key={`${entry}-${index}`} entering={FadeIn.duration(duration.transition)} style={styles.queueEntry}>
            <AppText variant="codeSmall" align="ltr" color={syntax.plain}>
              {entry}
            </AppText>
          </Animated.View>
        ))
      )}
    </View>
  );
}

/**
 * The notional machine (PRD 6.6): the code with the line about to run, the variables, the output
 * so far and, for asynchronous code, the call stack and both queues. Every step comes from the
 * trace recorded when the snippet was executed; nothing runs on the device. Code, values and
 * output stay left to right in both languages; under Reduce Motion steps change instantly.
 */
export function ExecutionPlayer({ trace }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const reducedMotion = useReducedMotion();
  const step = trace.steps[stepIndex];
  const lastIndex = trace.steps.length - 1;
  const previous = trace.steps[stepIndex - 1];

  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= lastIndex) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStepIndex((index) => Math.min(lastIndex, index + 1)), SPEEDS_MS[speedIndex]);
    return () => clearTimeout(timer);
  }, [lastIndex, playing, speedIndex, stepIndex]);

  const changed = (name: string, scope: string, value: string) =>
    previous !== undefined && previous.variables.find((variable) => variable.name === name && variable.scope === scope)?.value !== value;

  return (
    <View style={styles.player}>
      <AppText variant="label" color={palette.text.secondary} accessibilityLiveRegion="polite">
        {step.line === 0 ? t("player.finished") : t("player.step", { current: stepIndex + 1, total: trace.steps.length })}
      </AppText>
      <CodeView lines={trace.code} markedLines={step.line > 0 ? { [step.line]: "current" } : {}} />

      <Surface style={styles.panel}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("player.variables")}
        </AppText>
        {step.variables.length === 0 ? (
          <AppText variant="body" color={palette.text.muted}>
            {t("player.noVariables")}
          </AppText>
        ) : (
          step.variables.map((variable) => {
            const isNew = changed(variable.name, variable.scope, variable.value);
            return (
              <View key={`${variable.scope}.${variable.name}`} style={[styles.variable, isNew && styles.changedVariable]} accessible accessibilityLabel={`${variable.name} = ${variable.value}`}>
                <AppText variant="code" align="ltr" color={syntax.functionName} style={styles.variableName}>
                  {variable.name}
                </AppText>
                <Animated.View key={isNew && !reducedMotion ? `${stepIndex}` : "steady"} entering={isNew && !reducedMotion ? FadeIn.duration(duration.emphasis) : undefined} style={styles.variableValue}>
                  <AppText variant="code" align="ltr" color={syntax.plain}>
                    {variable.value}
                  </AppText>
                </Animated.View>
                {variable.scope !== "global" ? (
                  <AppText variant="codeSmall" align="ltr" color={palette.text.muted}>
                    {variable.scope}
                  </AppText>
                ) : null}
              </View>
            );
          })
        )}
      </Surface>

      {trace.usesEventLoop ? (
        <View style={styles.eventLoop}>
          <QueueColumn title={t("player.callStack")} entries={[...step.callStack].reverse()} />
          <QueueColumn title={t("player.microtasks")} entries={step.microtasks} />
          <QueueColumn title={t("player.macrotasks")} entries={step.macrotasks} />
        </View>
      ) : null}

      <View style={styles.output} accessible accessibilityLabel={`${t("player.output")}: ${trace.output.slice(0, step.outputCount).join(", ") || t("player.noOutput")}`}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("player.output")}
        </AppText>
        {step.outputCount === 0 ? (
          <AppText variant="code" align="ltr" color={palette.text.muted}>
            {t("player.noOutput")}
          </AppText>
        ) : (
          trace.output.slice(0, step.outputCount).map((line, index) => (
            <AppText key={index} variant="code" align="ltr" color={syntax.string}>
              {line}
            </AppText>
          ))
        )}
      </View>

      <View style={styles.controls}>
        <OutlineButton label={t("player.previous")} disabled={stepIndex === 0} onPress={() => setStepIndex((index) => Math.max(0, index - 1))} style={styles.control} />
        <OutlineButton label={playing ? t("player.pause") : t("player.play")} disabled={stepIndex >= lastIndex} onPress={() => setPlaying((value) => !value)} style={styles.control} />
        <OutlineButton label={t("player.next")} disabled={stepIndex >= lastIndex} onPress={() => setStepIndex((index) => Math.min(lastIndex, index + 1))} style={styles.control} />
      </View>
      <OutlineButton label={`${t("player.speed")} ${"•".repeat(speedIndex + 1)}`} onPress={() => setSpeedIndex((index) => (index + 1) % SPEEDS_MS.length)} />
    </View>
  );
}

const styles = StyleSheet.create({
  player: { gap: space.lg },
  panel: { gap: space.sm, padding: space.lg },
  variable: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radii.chip, direction: "ltr" },
  changedVariable: { backgroundColor: "rgba(247,223,30,0.12)" },
  variableName: { minWidth: 80 },
  variableValue: { flex: 1 },
  eventLoop: { flexDirection: "row", gap: space.sm, direction: "ltr" },
  queue: { flex: 1, gap: space.xs, padding: space.sm, borderRadius: radii.chip, backgroundColor: palette.bg.surface, minHeight: 96 },
  queueEntry: { paddingHorizontal: space.xs, paddingVertical: 2, borderRadius: radii.chip, backgroundColor: palette.bg.raised },
  output: { gap: space.xs, padding: space.md, borderRadius: radii.card, backgroundColor: palette.bg.code },
  controls: { flexDirection: "row", gap: space.sm },
  control: { flex: 1, paddingHorizontal: space.sm },
});
