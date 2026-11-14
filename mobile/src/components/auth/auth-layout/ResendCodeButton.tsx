import { TextButton } from "@/components/common/LipButton/TextButton";
import { t } from "@/i18n/translate";

/** Asks for a fresh code; counts down the cooldown before it can be pressed again. */
export function ResendCodeButton({ secondsLeft, onPress }: { secondsLeft: number; onPress: () => void }) {
  return <TextButton label={secondsLeft > 0 ? t("auth.resendIn", { seconds: secondsLeft }) : t("auth.resend")} disabled={secondsLeft > 0} onPress={onPress} />;
}
