import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
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

import { useAuth } from "@/contexts/AuthContext";
import AppDialog from "@/components/ui/AppDialog";
import { useLayoutTokens } from "@/hooks/use-layout-tokens";
import { useResponsiveTypography } from "@/hooks/use-responsive-typography";

export default function BirthdayScreen() {
  const router = useRouter();
  const { pendingGoogleProfile, setPendingGoogleProfile } = useAuth();
  const { spacing, radius } = useLayoutTokens();
  const colorScheme = useColorScheme();
  const { scale, type, maxContentWidth } = useResponsiveTypography();
  const isDark = colorScheme === "dark";
  const [month, setMonth] = useState(existingMonth(pendingGoogleProfile?.birthday));
  const [day, setDay] = useState(existingDay(pendingGoogleProfile?.birthday));
  const [year, setYear] = useState(existingYear(pendingGoogleProfile?.birthday));
  const [errorText, setErrorText] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  function showDialog(message: string) {
    setDialogMessage(message);
    setDialogVisible(true);
  }

  const disabled = useMemo(() => !month || !day || !year, [day, month, year]);
  const palette = isDark
    ? {
        screen: "#08131F",
        orbA: "#12263B",
        orbB: "#0C1B2A",
        card: "#0F2236",
        cardBorder: "#204263",
        heading: "#F3F7FB",
        body: "#9CB3CE",
        inputBg: "#15304A",
        inputBorder: "#3A648A",
        inputText: "#ECF4FC",
        button: "#2F74E8",
        buttonText: "#F4F9FF",
        error: "#FF9CAB",
      }
    : {
        screen: "#E9EFF9",
        orbA: "#D5E6FB",
        orbB: "#DDEBFA",
        card: "#0F4672",
        cardBorder: "#0B3A60",
        heading: "#F8FBFF",
        body: "#C9DCF2",
        inputBg: "#2A587E",
        inputBorder: "#EEF4FC",
        inputText: "#F2F8FF",
        button: "#6A8DAC",
        buttonText: "#F4FAFF",
        error: "#F7C7D1",
      };

  useEffect(() => {
    if (!pendingGoogleProfile) {
      router.replace("/login");
    }
  }, [pendingGoogleProfile, router]);

  if (!pendingGoogleProfile) {
    return null;
  }

  function goNext() {
    setErrorText(null);
    const birthday = parseBirthdayParts(year, month, day);
    if (!birthday) {
      const message = "Please enter a valid birthday.";
      setErrorText(message);
      showDialog(message);
      return;
    }
    const currentProfile = pendingGoogleProfile;
    if (!currentProfile) {
      return;
    }

    setPendingGoogleProfile({
      ...currentProfile,
      birthday,
    });
    router.push({
      pathname: "/onboarding/profile",
      params: { birthday },
    });
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.screen }]}>
      <View style={[styles.backgroundOrbTop, { backgroundColor: palette.orbA }]} />
      <View style={[styles.backgroundOrbBottom, { backgroundColor: palette.orbB }]} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View style={[styles.contentWrap, { maxWidth: maxContentWidth }]}>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder, borderRadius: radius.xl + 2, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, gap: spacing.md }]}>
              <Text style={[styles.title, { color: palette.heading, fontSize: Math.round(28 * scale) }]}>Your Birthday</Text>
              <Text style={[styles.subtitle, { color: palette.body, fontSize: type.body }]}>Please enter your Birthday.</Text>
            <View style={[styles.row, { gap: spacing.sm }]}>
              <TextInput
                value={month}
                onChangeText={(value) => setMonth(value.replace(/\D/g, "").slice(0, 2))}
                style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.inputText, fontSize: Math.round(24 * scale), borderRadius: radius.lg, minHeight: 54 }]}
                placeholder="MM"
                placeholderTextColor="#8BA4C2"
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                value={day}
                onChangeText={(value) => setDay(value.replace(/\D/g, "").slice(0, 2))}
                style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.inputText, fontSize: Math.round(24 * scale), borderRadius: radius.lg, minHeight: 54 }]}
                placeholder="DD"
                placeholderTextColor="#8BA4C2"
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                value={year}
                onChangeText={(value) => setYear(value.replace(/\D/g, "").slice(0, 4))}
                style={[styles.input, styles.yearInput, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.inputText, fontSize: Math.round(24 * scale), borderRadius: radius.lg, minHeight: 54 }]}
                placeholder="YYYY"
                placeholderTextColor="#8BA4C2"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
              {errorText ? <Text style={[styles.errorText, { color: palette.error, fontSize: Math.round(11 * scale) }]}>{errorText}</Text> : null}
              <Pressable style={[styles.button, { backgroundColor: palette.button, borderRadius: radius.md, minHeight: 46 }, disabled && styles.buttonDisabled]} onPress={goNext} disabled={disabled}>
                <Text style={[styles.buttonText, { color: palette.buttonText, fontSize: Math.round(15 * scale) }]}>Next</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppDialog
        visible={dialogVisible}
        kind="error"
        title="Invalid Birthday"
        message={dialogMessage}
        onClose={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

function parseBirthdayParts(year: string, month: string, day: string): string | null {
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
    return null;
  }

  const yyyy = Number(year);
  const mm = Number(month);
  const dd = Number(day);
  if (yyyy < 1900 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return null;
  }

  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== yyyy ||
    date.getMonth() + 1 !== mm ||
    date.getDate() !== dd
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function existingMonth(birthday?: string | null): string {
  if (!birthday || birthday.length < 7) {
    return "";
  }
  return birthday.slice(5, 7);
}

function existingDay(birthday?: string | null): string {
  if (!birthday || birthday.length < 10) {
    return "";
  }
  return birthday.slice(8, 10);
}

function existingYear(birthday?: string | null): string {
  if (!birthday || birthday.length < 4) {
    return "";
  }
  return birthday.slice(0, 4);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#E9EFF9" },
  backgroundOrbTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.58,
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -100,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.5,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: "center",
  },
  contentWrap: {
    width: "100%",
  },
  card: {
    borderRadius: 26,
    backgroundColor: "#0F4672",
    borderWidth: 1,
    borderColor: "#0B3A60",
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 12,
  },
  title: {
    color: "#F8FBFF",
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "800",
  },
  subtitle: {
    color: "#C9DCF2",
    fontSize: 14,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    gap: 9,
  },
  input: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: "#EEF4FC",
    backgroundColor: "#2A587E",
    color: "#F2F8FF",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
  },
  yearInput: {
    flex: 1.2,
  },
  button: {
    marginTop: 2,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#6A8DAC",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#F4FAFF",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
  },
  errorText: {
    color: "#F7C7D1",
    fontSize: 11,
    lineHeight: 14,
  },
});
