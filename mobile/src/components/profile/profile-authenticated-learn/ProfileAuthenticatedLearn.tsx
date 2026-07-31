import { Pressable, Text, View } from "react-native";
import type { UseProfileScreenReturn } from "@/hooks/useProfileScreen";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { profileSectionCardStyles } from "@/theme/profileSectionCard";
import { l } from "./ProfileAuthenticatedLearn.styles";

function OptRow({
  values,
  selected,
  onSelect,
}: {
  values: { key: string; label: string }[];
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={l.optRow}>
      {values.map((v) => (
        <Pressable key={v.key} onPress={() => onSelect(v.key)} style={[l.chip, selected === v.key && l.chipOn]}>
          <Text style={[l.chipTxt, selected === v.key && l.chipTxtOn]}>{v.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ProfileAuthenticatedLearn({ p }: { p: UseProfileScreenReturn }) {
  return (
    <TerminalFrame label="learn.prefs">
      <Text style={profileSectionCardStyles.fieldLabel}>My Goal</Text>
      <OptRow values={p.goals.map((i) => ({ key: i.key, label: i.label }))} selected={p.draftGoal} onSelect={(k) => p.setDraftGoal(k as (typeof p.goals)[number]["key"])} />
      <Text style={profileSectionCardStyles.fieldLabel}>My JavaScript Level</Text>
      <OptRow values={p.levels.map((i) => ({ key: i.key, label: i.label }))} selected={p.draftLevel} onSelect={(k) => p.setDraftLevel(k as (typeof p.levels)[number]["key"])} />
      <Text style={profileSectionCardStyles.fieldLabel}>Daily Practice Goal</Text>
      <OptRow
        values={p.commitmentOptions.map((i) => ({ key: i.key, label: i.label }))}
        selected={p.draftCommitment}
        onSelect={(k) => p.setDraftCommitment(k as (typeof p.commitmentOptions)[number]["key"])}
      />
      <Text style={profileSectionCardStyles.fieldLabel}>
        Today: {p.studyMinutesToday} min / {p.commitment} min goal
      </Text>
      <PressableScale
        style={[profileSectionCardStyles.saveButton, p.saving && profileSectionCardStyles.saveButtonDisabled]}
        disabled={p.saving}
        haptic="light"
        onPress={() => void p.onSaveLearningSettings()}
      >
        <Text style={profileSectionCardStyles.saveButtonLabel}>{p.saving ? "Saving..." : "Save Preferences"}</Text>
      </PressableScale>
      {p.saveMessage ? <Text style={profileSectionCardStyles.saveMessage}>{p.saveMessage}</Text> : null}
    </TerminalFrame>
  );
}
