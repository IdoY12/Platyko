import { type PropsWithChildren } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { styles } from "./TerminalFrame.styles";

type Props = PropsWithChildren<{
  /** Optional header rendered as a `// comment` line above the content. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}>;

/** CYBERDECK card: hairline surface with phosphor corner brackets and an optional `// label`. */
export function TerminalFrame({ label, style, children }: Props) {
  return (
    <View style={[styles.frame, style]}>
      {label ? <Text style={styles.label}>{`// ${label}`}</Text> : null}
      {children}
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />
    </View>
  );
}
