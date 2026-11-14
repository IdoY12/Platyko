import { createContext } from "react";
import { View, type ViewProps } from "react-native";

/** True inside an `LtrView`: text there is already in a left-to-right layout. */
export const PinnedLeftToRightContext = createContext(false);

/**
 * A container that always lays out left to right, whatever the interface language: code, the
 * execution player, Parsons lines, token chips, code input and option cards that hold code
 * (PRD 12.10). Text inside it aligns left without the right-to-left compensation `AppText`
 * applies elsewhere.
 */
export function LtrView({ style, ...viewProps }: ViewProps) {
  return (
    <PinnedLeftToRightContext.Provider value>
      <View {...viewProps} style={[{ direction: "ltr" }, style]} />
    </PinnedLeftToRightContext.Provider>
  );
}
