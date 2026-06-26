import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme/theme";

export type AppIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
};

export function AppIcon({ name, size = 20, color = colors.textPrimary }: Props) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
