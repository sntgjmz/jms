import { FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { createDemoSession, useAuth } from "@/contexts/AuthContext";
import { useLayoutTokens } from "@/hooks/use-layout-tokens";
import { useResponsiveTypography } from "@/hooks/use-responsive-typography";

type LoginMode = "user" | "operator";

export default function LoginScreen() {
  const router = useRouter();
  const { isHydrating, session, setSession } = useAuth();
  const { spacing, radius } = useLayoutTokens();
  const colorScheme = useColorScheme();
  const { type: typography, maxContentWidth } = useResponsiveTypography();
  const isDark = colorScheme === "dark";
  const [mode, setMode] = useState<LoginMode>("user");
  const [operatorUsername, setOperatorUsername] = useState("demo.operator");
  const [operatorPassword, setOperatorPassword] = useState("preview-only");
  const [isPassengerLoading, setIsPassengerLoading] = useState(false);
  const [isOperatorLoading, setIsOperatorLoading] = useState(false);
  const theme = mode === "user"
    ? {
        accent: "#2F74E8",
        accentDark: "#0E3460",
        accentSoft: "#EAF3FF",
        accentBorder: "#C7D9EE",
        accentTextSoft: "#DBE9FF",
        cardGlow: "#7DA4D4",
        buttonTextDark: "#08284B",
        pillText: "#245E96",
      }
    : {
        accent: "#F28C28",
        accentDark: "#8A4A10",
        accentSoft: "#FFF1E1",
        accentBorder: "#F3CFAB",
        accentTextSoft: "#FFE3C0",
        cardGlow: "#E5B27D",
        buttonTextDark: "#5D2F05",
        pillText: "#A55B10",
      };
  const palette = isDark
    ? {
        screen: "#08131F",
        orbTop: "#11253A",
        orbBottom: "#0C1B2A",
        card: "rgba(13, 28, 44, 0.96)",
        cardBorder: "#1A3654",
        text: "#F3F7FB",
        subtext: "#8EA8C5",
        inputBg: "#0F2235",
        inputBorder: "#25486D",
        inputText: "#F3F7FB",
        toggleIdle: "rgba(12, 23, 37, 0.92)",
        toggleBorder: "#1C3A59",
        iconIdle: "#132942",
      }
    : {
        screen: "#E9EFF9",
        orbTop: "#D5E6FB",
        orbBottom: "#DDEBFA",
        card: "rgba(248, 251, 255, 0.97)",
        cardBorder: "#CCDBEE",
        text: "#0E2A4A",
        subtext: "#4E6D90",
        inputBg: "#FFFFFF",
        inputBorder: "#C8D9EE",
        inputText: "#0E2A4A",
        toggleIdle: "rgba(248, 251, 255, 0.94)",
        toggleBorder: "#C7D9EE",
        iconIdle: "#EAF3FF",
      };

  useEffect(() => {
    if (isHydrating || !session) {
      return;
    }
    if (session.principalType === "BOAT_OPERATOR") {
      router.replace("/operator/home");
      return;
    }
    router.replace("/user/home");
  }, [isHydrating, router, session]);

  const operatorDisabled = useMemo(
    () => isHydrating || isPassengerLoading || isOperatorLoading || !operatorUsername.trim() || !operatorPassword.trim(),
    [isPassengerLoading, isHydrating, isOperatorLoading, operatorPassword, operatorUsername],
  );

  async function handlePassengerDemo() {
    setIsPassengerLoading(true);
    await setSession(createDemoSession("passenger"));
    router.replace("/user/home");
    setIsPassengerLoading(false);
  }

  async function handleOperatorDemo() {
    setIsOperatorLoading(true);
    await setSession(createDemoSession("operator"));
    router.replace("/operator/home");
    setIsOperatorLoading(false);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.screen }]}>
      <View style={[styles.backgroundOrbTop, { backgroundColor: palette.orbTop }]} />
      <View style={[styles.backgroundOrbBottom, { backgroundColor: palette.orbBottom }]} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets>
          <View style={[styles.contentWrap, { maxWidth: maxContentWidth, gap: spacing.lg }]}>
            <View style={[styles.brandBlock, { gap: spacing.sm }]}>
              <Image source={require("../assets/images/isla-sakay-login.png")} style={styles.heroLogo} contentFit="contain" />
              <View
                style={[
                  styles.eyebrowPill,
                  {
                    borderRadius: radius.pill,
                    backgroundColor: isDark ? "#0F2235" : mode === "user" ? "#F7FBFF" : "#FFF8F1",
                    borderColor: isDark ? "#25486D" : theme.accentBorder,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 1,
                  },
                ]}>
                <FontAwesome name={mode === "user" ? "user" : "ship"} size={11} color={theme.pillText} />
                <Text style={[styles.eyebrowText, { color: theme.pillText, fontSize: typography.caption }]}>
                  {mode === "user" ? "Passenger Access" : "Operator Access"}
                </Text>
              </View>
            </View>

            <View style={[styles.modeRow, { gap: spacing.sm }]}>
              <Pressable
                onPress={() => setMode("user")}
                style={[
                  styles.modeButton,
                  { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 54 },
                  { backgroundColor: palette.toggleIdle, borderColor: palette.toggleBorder },
                  mode === "user" && styles.modeButtonActive,
                  mode === "user" && { backgroundColor: "#2F74E8", borderColor: "#2F74E8" },
                ]}>
                <View style={[styles.modeIconWrap, { backgroundColor: palette.iconIdle }, mode === "user" && styles.modeIconWrapActive]}>
                  <FontAwesome name="user" size={12} color={mode === "user" ? "#F5FAFF" : "#173F68"} />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modeTitle,
                      { color: isDark ? "#E7EFF8" : "#14385D", fontSize: typography.secondary },
                      mode === "user" && styles.modeTitleActive,
                    ]}>
                    User
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setMode("operator")}
                style={[
                  styles.modeButton,
                  { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 54 },
                  { backgroundColor: palette.toggleIdle, borderColor: palette.toggleBorder },
                  mode === "operator" && styles.modeButtonActive,
                  mode === "operator" && { backgroundColor: "#F28C28", borderColor: "#F28C28" },
                ]}>
                <View style={[styles.modeIconWrap, { backgroundColor: palette.iconIdle }, mode === "operator" && styles.modeIconWrapActive, mode === "operator" && { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                  <FontAwesome name="ship" size={12} color={mode === "operator" ? "#FFF9F2" : "#173F68"} />
                </View>
                <View>
                  <Text
                    style={[
                      styles.modeTitle,
                      { color: isDark ? "#E7EFF8" : "#14385D", fontSize: typography.secondary },
                      mode === "operator" && styles.modeTitleActive,
                    ]}>
                    Boat Operator
                  </Text>
                </View>
              </Pressable>
            </View>

            {mode === "user" ? (
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder, shadowColor: theme.cardGlow, borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.sm }]}>
                <Text style={[styles.sectionTitle, { color: palette.text, fontSize: typography.title }]}>Continue as Passenger</Text>
                <Pressable style={[styles.primaryButton, { backgroundColor: theme.accent, borderRadius: radius.lg, minHeight: 54, paddingHorizontal: spacing.md }]} onPress={handlePassengerDemo} disabled={isHydrating || isPassengerLoading}>
                  <View style={styles.googleIcon}>
                    <FontAwesome name="user" size={15} color="#2F74E8" />
                  </View>
                  <View style={styles.primaryCopy}>
                    <Text style={[styles.primaryTitle, { color: theme.buttonTextDark, fontSize: typography.body }]}>Open passenger demo</Text>
                    <Text style={[styles.primaryHint, { color: theme.accentTextSoft, fontSize: typography.caption }]}>Fictional account. No Google sign-in needed.</Text>
                  </View>
                  {isPassengerLoading ? (
                    <ActivityIndicator size="small" color={theme.buttonTextDark} />
                  ) : (
                    <FontAwesome name="angle-right" size={18} color={theme.buttonTextDark} />
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder, shadowColor: theme.cardGlow, borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.sm }]}>
                <Text style={[styles.sectionTitle, { color: theme.accentDark, fontSize: typography.title }]}>Continue as Boat Operator</Text>
                <TextInput
                  value={operatorUsername}
                  onChangeText={setOperatorUsername}
                  placeholder="Demo username"
                  placeholderTextColor="#6A84A4"
                  style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.inputText, fontSize: typography.body, minHeight: 40, borderRadius: radius.md, paddingHorizontal: spacing.sm + 3 }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TextInput
                  value={operatorPassword}
                  onChangeText={setOperatorPassword}
                  placeholder="Demo password"
                  placeholderTextColor="#6A84A4"
                  style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.inputText, fontSize: typography.body, minHeight: 40, borderRadius: radius.md, paddingHorizontal: spacing.sm + 3 }]}
                  secureTextEntry
                />

                <Pressable style={[styles.loginButton, { backgroundColor: theme.accent, borderRadius: radius.md, minHeight: 44 }, operatorDisabled && styles.loginButtonDisabled]} onPress={handleOperatorDemo} disabled={operatorDisabled}>
                  {isOperatorLoading ? (
                    <ActivityIndicator size="small" color="#F6FAFF" />
                  ) : (
                    <Text style={[styles.loginButtonText, { fontSize: typography.body }]}>Open operator demo</Text>
                  )}
                </Pressable>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#E9EFF9" },
  backgroundOrbTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#D5E6FB",
    opacity: 0.85,
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -130,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#DDEBFA",
    opacity: 0.75,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 40,
    gap: 16,
    alignItems: "center",
  },
  contentWrap: {
    width: "100%",
    gap: 16,
  },
  brandBlock: {
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  heroLogo: {
    width: 200,
    height: 200,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F7FBFF",
    borderWidth: 1,
    borderColor: "#CFE0F4",
  },
  eyebrowText: {
    color: "#245E96",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C7D9EE",
    backgroundColor: "rgba(248, 251, 255, 0.94)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeButtonActive: {
    backgroundColor: "#2F74E8",
    borderColor: "#2F74E8",
  },
  modeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FF",
  },
  modeIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  modeTitle: {
    fontSize: 12,
    lineHeight: 14,
    color: "#14385D",
    fontWeight: "700",
  },
  modeTitleActive: { color: "#F6FAFF" },
  modeHint: {
    fontSize: 10,
    lineHeight: 11,
    color: "#5E7FA3",
  },
  modeHintActive: { color: "#DBE9FF" },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#CCDBEE",
    backgroundColor: "rgba(248, 251, 255, 0.97)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 11,
    shadowColor: "#7DA4D4",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 3,
  },
  sectionTitle: {
    color: "#0E2A4A",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "700",
  },
  sectionSubtext: {
    color: "#4E6D90",
    fontSize: 11,
    lineHeight: 13,
  },
  primaryButton: {
    marginTop: 4,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "#4E89F3",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  googleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCopy: {
    flex: 1,
    gap: 1,
  },
  primaryTitle: {
    color: "#08284B",
    fontSize: 13,
    lineHeight: 15,
    fontWeight: "700",
  },
  primaryHint: {
    color: "#E5F0FF",
    fontSize: 10,
    lineHeight: 11,
  },
  label: {
    color: "#22496F",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C8D9EE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    color: "#0E2A4A",
    fontSize: 13,
  },
  loginButton: {
    marginTop: 2,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F74E8",
  },
  loginButtonDisabled: {
    opacity: 0.55,
  },
  loginButtonText: {
    color: "#F6FAFF",
    fontSize: 13,
    lineHeight: 15,
    fontWeight: "700",
  },
  errorText: {
    color: "#B20F2A",
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
});
