import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold } from "@expo-google-fonts/rubik";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { applyLanguageAtStartup } from "@/i18n/languagePreference";
import { logError } from "@/utils/logger";

// The splash stays up until the fonts and the language are ready, so no screen ever renders in a
// fallback font or in the wrong direction.
void SplashScreen.preventAutoHideAsync();

/** True once the UI fonts are loaded and the stored (or device) language has been applied. */
export function useAppStartup(): boolean {
  const [fontsLoaded, fontError] = useFonts({
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const [languageApplied, setLanguageApplied] = useState(false);

  useEffect(() => {
    applyLanguageAtStartup()
      .catch((error: unknown) => logError("[APP]", error, { phase: "apply-language" }))
      .finally(() => setLanguageApplied(true));
  }, []);

  // A font that fails to load must not lock the user out: the system font is the fallback.
  const ready = (fontsLoaded || fontError !== null) && languageApplied;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  return ready;
}
