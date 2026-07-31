import { Pressable, Text, View } from "react-native";
import { styles } from "./ProfileScreen.styles";

type Props<K extends string> = {
  options: ReadonlyArray<{ key: K; label: string }>;
  selectedKey: string | null | undefined;
  onSelect: (key: K) => void;
};

/** Row of selectable preference chips (JS level / daily practice goal). */
export function GuestPreferenceChips<K extends string>({ options, selectedKey, onSelect }: Props<K>) {
  return (
    <View style={styles.guestRow}>
      {options.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onSelect(item.key)}
          style={[styles.guestChip, selectedKey === item.key && styles.guestChipOn]}
        >
          <Text style={[styles.guestChipText, selectedKey === item.key && styles.guestChipTextOn]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
