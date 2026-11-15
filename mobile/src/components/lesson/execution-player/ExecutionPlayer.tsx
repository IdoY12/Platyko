import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import type { ItemTrace } from "@project/content-model";
import { AppText } from "@/components/common/AppText/AppText";
import { CodeView } from "@/components/common/CodeView/CodeView";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Surface } from "@/components/common/Surface/Surface";
import { t } from "@/i18n/translate";
import { duration, palette, radii, space, syntax, wash } from "@/theme/tokens";
import { LtrView } from "@/components/common/AppText/LtrView";

type Props = { trace: ItemTrace };

const SPEEDS_MS = [1400, 800, 400];
const SPEED_ICONS = ["speedometer-slow", "speedometer-medium", "speedometer"] as const;

type ControlProps = { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; disabled?: boolean; primary?: boolean; onPress: () => void };

function ControlButton({ icon, label, disabled = false, primary = false, onPress }: ControlProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.control, primary && styles.primaryControl, disabled && styles.disabledControl]}
    >
      <MaterialCommunityIcons name={icon} size={28} color={primary ? palette.text.onBright : palette.text.primary} />
    </PressableScale>
  );
}

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
              <LtrView key={`${variable.scope}.${variable.name}`} style={[styles.variable, isNew && styles.changedVariable]} accessible accessibilityLabel={`${variable.name} = ${variable.value}`}>
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
              </LtrView>
            );
          })
        )}
      </Surface>

      {trace.usesEventLoop ? (
        <LtrView style={styles.eventLoop}>
          <QueueColumn title={t("player.callStack")} entries={[...step.callStack].reverse()} />
          <QueueColumn title={t("player.microtasks")} entries={step.microtasks} />
          <QueueColumn title={t("player.macrotasks")} entries={step.macrotasks} />
        </LtrView>
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

      <LtrView style={styles.controls}>
        <ControlButton icon="chevron-left" label={t("player.previous")} disabled={stepIndex === 0} onPress={() => setStepIndex((index) => Math.max(0, index - 1))} />
        <ControlButton icon={playing ? "pause" : "play"} label={playing ? t("player.pause") : t("player.play")} disabled={stepIndex >= lastIndex} primary onPress={() => setPlaying((value) => !value)} />
        <ControlButton icon="chevron-right" label={t("player.next")} disabled={stepIndex >= lastIndex} onPress={() => setStepIndex((index) => Math.min(lastIndex, index + 1))} />
        <ControlButton icon={SPEED_ICONS[speedIndex]} label={`${t("player.speed")} ${speedIndex + 1}`} onPress={() => setSpeedIndex((index) => (index + 1) % SPEEDS_MS.length)} />
      </LtrView>
    </View>
  );
}

const styles = StyleSheet.create({
  player: { gap: space.lg },
  panel: { gap: space.sm, padding: space.lg },
  variable: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radii.chip },
  changedVariable: { backgroundColor: wash.js },
  variableName: { minWidth: 80 },
  variableValue: { flex: 1 },
  eventLoop: { flexDirection: "row", gap: space.sm },
  queue: { flex: 1, gap: space.xs, padding: space.sm, borderRadius: radii.chip, backgroundColor: palette.bg.surface, minHeight: 96 },
  queueEntry: { paddingHorizontal: space.xs, paddingVertical: 2, borderRadius: radii.chip, backgroundColor: palette.bg.raised },
  output: { gap: space.xs, padding: space.md, borderRadius: radii.card, backgroundColor: palette.bg.code },
  controls: { flexDirection: "row", justifyContent: "center", gap: space.lg },
  control: { width: 56, height: 56, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg.raised },
  primaryControl: { backgroundColor: palette.brand.primary },
  disabledControl: { opacity: 0.4 },
});
