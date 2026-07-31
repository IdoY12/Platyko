import type { Dispatch, SetStateAction } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthScreen } from "@/hooks/useAuthScreen";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { useAppDispatch } from "@/redux/hooks";
import type { AppDispatch } from "@/redux/store";
import { AuthCredentials } from "../auth-credentials/AuthCredentials";
import { AuthGoogleButton } from "../auth-google-button/AuthGoogleButton";
import { styles } from "./AuthScreen.styles";

function AuthFooter({ dispatch, isLogin, setIsLogin }: { dispatch: AppDispatch; isLogin: boolean; setIsLogin: Dispatch<SetStateAction<boolean>> }) {
  return (
    <>
      <AuthGoogleButton dispatch={dispatch} />
      <Text style={styles.terms}>By continuing, you agree to our Terms and Privacy Policy.</Text>
      <Pressable onPress={() => setIsLogin((v) => !v)} style={styles.switchAuthBtn}>
        <Text style={styles.switchAuthText}>
          {isLogin ? "Need an account? Register" : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </>
  );
}

export function AuthScreen() {
  const dispatch = useAppDispatch();
  const a = useAuthScreen(dispatch);
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <MatrixRain opacity={0.15} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AuthCredentials {...a} />
        <AuthFooter dispatch={dispatch} isLogin={a.isLogin} setIsLogin={a.setIsLogin} />
      </ScrollView>
    </SafeAreaView>
  );
}
