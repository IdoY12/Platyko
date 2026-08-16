import type { Dispatch, SetStateAction } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuthScreen } from "@/hooks/useAuthScreen";
import { MatrixRain } from "@/components/common/MatrixRain/MatrixRain";
import { useAppDispatch } from "@/redux/hooks";
import type { AppDispatch } from "@/redux/store";
import { AuthAppleButton } from "../auth-apple-button/AuthAppleButton";
import { AuthCredentials } from "../auth-credentials/AuthCredentials";
import { AuthGoogleButton } from "../auth-google-button/AuthGoogleButton";
import { styles } from "./AuthScreen.styles";

function AuthFooter({ dispatch, email, isLogin, setIsLogin }: { dispatch: AppDispatch; email: string; isLogin: boolean; setIsLogin: Dispatch<SetStateAction<boolean>> }) {
  const navigation = useNavigation();
  return (
    <>
      {isLogin ? (
        <Pressable onPress={() => navigation.navigate("ForgotPassword", { email })} style={styles.switchAuthBtn}>
          <Text style={styles.switchAuthText}>Forgot password?</Text>
        </Pressable>
      ) : null}
      <AuthGoogleButton dispatch={dispatch} />
      <AuthAppleButton dispatch={dispatch} />
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
      <MatrixRain opacity={0.3} />
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthCredentials {...a} />
          <AuthFooter dispatch={dispatch} email={a.email} isLogin={a.isLogin} setIsLogin={a.setIsLogin} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
