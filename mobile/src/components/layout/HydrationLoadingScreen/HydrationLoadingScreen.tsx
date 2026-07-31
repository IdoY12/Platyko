import { SafeAreaView } from "react-native-safe-area-context";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { TypewriterText } from "@/components/common/TypewriterText/TypewriterText";
import { styles } from "./HydrationLoadingScreen.styles";

/** Shown while persisted Redux state is rehydrating or auth bootstrap is in flight. */
export function HydrationLoadingScreen() {
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <MatrixRain opacity={0.55} />
      <TypewriterText text="> BOOTING CODEQUEST..." style={styles.text} accessibilityLabel="Loading" />
    </SafeAreaView>
  );
}
