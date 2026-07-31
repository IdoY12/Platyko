import { type PropsWithChildren } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { styles } from "./TerminalFrame.styles";

type Props = PropsWithChildren<{
  /** Optional header rendered as a `// comment` line above the content. */
  label?: string;
  /** Corner-bracket color — accent yellow by default; pass colors.duel for arena frames. */
  bracketColor?: string;
  style?: StyleProp<ViewStyle>;
}>;

/** CYBERDECK card: hairline surface with corner brackets and an optional `// label`. */
export function TerminalFrame({ label, bracketColor, style, children }: Props) {
  const bracket = bracketColor != null && { borderColor: bracketColor };
  return (
    <View style={[styles.frame, style]}>
      {label ? <Text style={styles.label}>{`// ${label}`}</Text> : null}
      {children}
      <View style={[styles.corner, styles.cornerTopLeft, bracket]} />
      <View style={[styles.corner, styles.cornerTopRight, bracket]} />
      <View style={[styles.corner, styles.cornerBottomLeft, bracket]} />
      <View style={[styles.corner, styles.cornerBottomRight, bracket]} />
    </View>
  );
}
