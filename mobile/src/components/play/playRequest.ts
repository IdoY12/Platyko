import { Alert } from "react-native";
import { PLAY_ERRORS, type PlayError } from "@project/api-contract";
import { t } from "@/i18n/translate";
import { logError } from "@/utils/logger";

/**
 * Sends one play request and shows a refusal in the UI language. Resolves to the reply when the
 * server accepted it, or null when it refused or did not answer in time.
 */
export async function playRequest<Reply extends { error?: PlayError | null }>(send: () => Promise<Reply>): Promise<Reply | null> {
  try {
    const reply = await send();
    if (!reply.error) return reply;
    const known = (PLAY_ERRORS as readonly string[]).includes(reply.error);
    Alert.alert(t("play.title"), known ? t(`play.error.${reply.error}`) : t("play.offline"));
    return null;
  } catch (error) {
    logError("[PLAY]", error, { phase: "request" });
    Alert.alert(t("play.title"), t("play.offline"));
    return null;
  }
}
