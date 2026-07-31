import { useEffect, useState } from "react";
import { Text, type TextProps } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { motion } from "@/theme/theme";

const SCRAMBLE_GLYPHS = "01<>/{}[]#$_";
const TICK_MS = 32;

const randomGlyph = () => SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];

/** Scramble every non-space char; spaces stay put so the mono layout never shifts. */
const scramble = (text: string, solvedCount: number) =>
  [...text].map((char, index) => (index < solvedCount || char === " " ? char : randomGlyph())).join("");

type Props = TextProps & { text: string; delayMs?: number };

/**
 * "Decoding" text: characters flicker through terminal glyphs, then resolve
 * left-to-right over motion.scrambleMs. Renders the final text immediately
 * under reduced motion.
 */
export function GlyphScrambleText({ text, delayMs = 0, ...textProps }: Props) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => (reduceMotion ? text : scramble(text, 0)));

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(text);
      return;
    }
    setDisplay(scramble(text, 0));
    let tick = 0;
    const totalTicks = Math.max(1, Math.round(motion.scrambleMs / TICK_MS));
    let timer: ReturnType<typeof setInterval> | undefined;
    const startTimer = setTimeout(() => {
      timer = setInterval(() => {
        tick += 1;
        setDisplay(scramble(text, Math.round((tick / totalTicks) * text.length)));
        if (tick >= totalTicks) clearInterval(timer);
      }, TICK_MS);
    }, delayMs);
    return () => {
      clearTimeout(startTimer);
      clearInterval(timer);
    };
  }, [text, delayMs, reduceMotion]);

  return <Text {...textProps}>{display}</Text>;
}
