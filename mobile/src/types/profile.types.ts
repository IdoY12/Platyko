import type { AppIconName } from "@/components/common/AppIcon/AppIcon";

export type GoalKey = "JOB" | "WORK" | "FUN" | "PROJECT";

export type LevelKey = "JUNIOR" | "MID" | "SENIOR";

export type CommitmentKey = "10" | "15" | "25";

export type StatItem = {
  icon: AppIconName;
  label: string;
  value: string;
};
