import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { colors } from "@/theme/theme";
import type { UseProfileScreenReturn } from "@/hooks/useProfileScreen";
import { AppIcon } from "@/components/common/AppIcon/AppIcon";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { TerminalFrame } from "@/components/common/TerminalFrame/TerminalFrame";
import { t } from "./ProfileAuthenticatedTop.styles";

export function ProfileAuthenticatedTop({ p }: { p: UseProfileScreenReturn }) {
  if (p.screenLoading) {
    return (
      <View style={t.skWrap}>
        <View style={t.skCirc} />
        <View style={t.skLg} />
        <View style={t.skSm} />
        <View style={t.skRow}>
          <View style={t.skCard} />
          <View style={t.skCard} />
          <View style={t.skCard} />
        </View>
      </View>
    );
  }

  return (
    <>
      <TerminalFrame label="user" style={t.hero}>
        <MatrixRain opacity={0.18} intensity={0.6} />
        <Pressable style={t.avatarShell} onPress={p.onAvatarPress}>
          {p.avatarUrl ? (
            <Image source={{ uri: p.avatarUrl }} style={t.avatarImg} />
          ) : (
            <View style={t.initialsAv}>
              <Text style={t.initialsTxt}>{p.initials}</Text>
            </View>
          )}
          <View style={t.camBadge}>
            <AppIcon name="pencil" size={16} color={colors.onAccent} />
          </View>
        </Pressable>
        <Text style={t.name}>{p.username}</Text>
        <Text style={t.email}>{p.email}</Text>
        <Text style={t.meta}>
          Level {p.level} · Duels {p.duelWins}W / {p.duelLosses}L · {p.duelWinRate} win rate
        </Text>
      </TerminalFrame>
      {p.uploadingAvatar ? (
        <View style={t.upCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={t.upTxt}>Uploading avatar... {p.uploadProgress}%</Text>
        </View>
      ) : null}
      <View style={t.statsRow}>
        {p.stats.map((item) => (
          <TerminalFrame key={item.label} style={t.pill}>
            <AppIcon name={item.icon} color={colors.accent} />
            <Text style={t.pillVal}>{item.value}</Text>
            <Text style={t.pillLbl}>{item.label}</Text>
          </TerminalFrame>
        ))}
      </View>
    </>
  );
}
