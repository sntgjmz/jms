import { FontAwesome } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Modal,
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
import { ApiError, loginWithGoogle, updateAppUserBirthday } from "@/services/api";
import { normalizePhilippinePhone } from "@/utils/phone";

type SelectOption = { label: string; value: string };
type ActiveBirthdayPicker = "month" | "day" | "year" | null;
type ProfileField = "firstName" | "middleName" | "lastName" | "nickname" | "phone" | "birthdayMonth" | "birthdayDay" | "birthdayYear";

const MONTH_OPTIONS: SelectOption[] = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const DAY_OPTIONS: SelectOption[] = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  return { label: `${day}`, value: `${day}`.padStart(2, "0") };
});

const YEAR_OPTIONS: SelectOption[] = (() => {
  const currentYear = new Date().getFullYear();
  const years: SelectOption[] = [];
  for (let y = currentYear; y >= 1900; y -= 1) {
    years.push({ label: `${y}`, value: `${y}` });
  }
  return years;
})();

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { pendingGoogleProfile, setPendingGoogleProfile, setSession } = useAuth();
  const { spacing, radius } = useLayoutTokens();
  const colorScheme = useColorScheme();
  const { type, maxContentWidth } = useResponsiveTypography();
  const isDark = colorScheme === "dark";

  const [nickname, setNickname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [activeBirthdayPicker, setActiveBirthdayPicker] = useState<ActiveBirthdayPicker>(null);
  const [pictureUrl] = useState(pendingGoogleProfile?.pictureUrl ?? null);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [focusedField, setFocusedField] = useState<ProfileField | null>(null);
  const [stepOneAttempted, setStepOneAttempted] = useState(false);
  const [stepTwoAttempted, setStepTwoAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const palette = isDark
    ? {
        screen: "#08131F",
        orbA: "#11253A",
        orbB: "#0C1B2A",
        card: "rgba(13, 28, 44, 0.96)",
        cardBorder: "#1A3654",
        text: "#F3F7FB",
        subtext: "#8EA8C5",
        inputBg: "#0F2235",
        inputBorder: "#25486D",
        inputText: "#F3F7FB",
        focusBorder: "#5EA5F2",
        focusGlow: "rgba(94,165,242,0.28)",
        errorBorder: "#E7738B",
        helperText: "#9BB3CD",
        errorText: "#F49AAE",
      }
    : {
        screen: "#E9EFF9",
        orbA: "#D5E6FB",
        orbB: "#DDEBFA",
        card: "#F8FBFF",
        cardBorder: "#C7D8EC",
        text: "#0E2F54",
        subtext: "#4D6D8F",
        inputBg: "#FFFFFF",
        inputBorder: "#C8D9EE",
        inputText: "#0D2E52",
        focusBorder: "#2F74E8",
        focusGlow: "rgba(47,116,232,0.18)",
        errorBorder: "#D64967",
        helperText: "#6A84A4",
        errorText: "#C03A56",
      };

  const birthday = useMemo(
    () => composeBirthday(birthYear, birthMonth, birthDay),
    [birthDay, birthMonth, birthYear],
  );

  const stepOneInvalid = useMemo(() => {
    return (
      !firstName.trim() ||
      !middleName.trim() ||
      !lastName.trim() ||
      !nickname.trim() ||
      !phone.trim()
    );
  }, [firstName, lastName, middleName, nickname, phone]);

  const stepTwoInvalid = useMemo(() => !birthday, [birthday]);
  const firstNameError = stepOneAttempted && !firstName.trim();
  const middleNameError = stepOneAttempted && !middleName.trim();
  const lastNameError = stepOneAttempted && !lastName.trim();
  const nicknameError = stepOneAttempted && !nickname.trim();
  const phoneRequiredError = stepOneAttempted && !phone.trim();
  const phoneFormatError = stepOneAttempted && !!phone.trim() && !normalizePhilippinePhone(phone);
  const birthdayError = stepTwoAttempted && !birthday;

  function showDialog(title: string, message: string) {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  }

  useEffect(() => {
    if (!pendingGoogleProfile) {
      router.replace("/login");
      return;
    }
  }, [pendingGoogleProfile, router]);

  if (!pendingGoogleProfile) {
    return null;
  }

  async function submitProfile() {
    setErrorText(null);
    const currentProfile = pendingGoogleProfile;
    if (!currentProfile) {
      return;
    }
    if (!birthday) {
      const message = "Please select a valid birthday.";
      setErrorText(message);
      showDialog("Birthday Required", message);
      return;
    }

    const normalizedPhone = normalizePhilippinePhone(phone);
    if (!normalizedPhone) {
      const message = "Phone number must be a valid Philippines mobile format (+639xxxxxxxxx or 09xxxxxxxxx).";
      setErrorText(message);
      showDialog("Invalid Phone Number", message);
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedFullName = [firstName.trim(), middleName.trim(), lastName.trim()].join(" ");
      const basePayload = {
        idToken: currentProfile.idToken,
        email: currentProfile.email,
        googleSub: currentProfile.googleSub,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: combinedFullName,
        nickname: nickname.trim(),
        phone: normalizedPhone,
        birthday,
        pictureUrl:
          pictureUrl && /^https?:\/\//i.test(pictureUrl)
            ? pictureUrl
            : currentProfile.pictureUrl ?? undefined,
      };

      let response;
      try {
        response = await loginWithGoogle(basePayload);
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          response = await loginWithGoogle({
            ...basePayload,
            forceLogin: true,
          });
        } else {
          throw error;
        }
      }

      try {
        await updateAppUserBirthday(response.principalId, birthday, response.accessToken);
      } catch (birthdayError) {
        // Backward compatibility: older backend builds may not have /app-users/{id}/birthday yet.
        // Do not block login flow on 404; surface other errors.
        if (!(birthdayError instanceof ApiError && birthdayError.status === 404)) {
          throw birthdayError;
        }
      }

      await setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        sessionId: response.sessionId,
        principalType: response.principalType,
        principalId: response.principalId,
        username: response.username,
        accessExpiresAt: response.accessExpiresAt,
      });
      setPendingGoogleProfile(null);
      router.replace("/user/home");
    } catch (error) {
      const message = resolveAuthError(error);
      setErrorText(message);
      showDialog("Unable to Complete Onboarding", message);
    } finally {
      setIsSubmitting(false);
    }
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
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder, borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl - 2, gap: spacing.sm + 3 }]}>
              <Text style={[styles.title, { color: palette.text, fontSize: type.title }]}>Complete your profile</Text>
              <Text style={[styles.subtitle, { color: palette.subtext, fontSize: type.secondary }]}>Please fill in your details manually to continue.</Text>

            <View style={styles.stepperRow}>
              <View style={[styles.stepPill, formStep === 1 && styles.stepPillActive]}>
                <Text style={[styles.stepPillText, formStep === 1 && styles.stepPillTextActive]}>Step 1</Text>
              </View>
              <View style={[styles.stepPill, formStep === 2 && styles.stepPillActive]}>
                <Text style={[styles.stepPillText, formStep === 2 && styles.stepPillTextActive]}>Step 2</Text>
              </View>
            </View>

            {formStep === 1 ? (
              <>
                <View style={styles.twoColRow}>
                  <Field
                    palette={palette}
                    textScale={type}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    autoCapitalize="words"
                    containerStyle={styles.fieldHalf}
                    isFocused={focusedField === "firstName"}
                    hasError={firstNameError}
                    helperText={firstNameError ? "First name is required." : undefined}
                    onFocus={() => setFocusedField("firstName")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <Field
                    palette={palette}
                    textScale={type}
                    value={middleName}
                    onChangeText={setMiddleName}
                    placeholder="Middle name"
                    autoCapitalize="words"
                    containerStyle={styles.fieldHalf}
                    isFocused={focusedField === "middleName"}
                    hasError={middleNameError}
                    helperText={middleNameError ? "Middle name is required." : undefined}
                    onFocus={() => setFocusedField("middleName")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <View style={styles.twoColRow}>
                  <Field
                    palette={palette}
                    textScale={type}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    autoCapitalize="words"
                    containerStyle={styles.fieldHalf}
                    isFocused={focusedField === "lastName"}
                    hasError={lastNameError}
                    helperText={lastNameError ? "Last name is required." : undefined}
                    onFocus={() => setFocusedField("lastName")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <Field
                    palette={palette}
                    textScale={type}
                    value={nickname}
                    onChangeText={setNickname}
                    placeholder="Nickname"
                    autoCapitalize="words"
                    containerStyle={styles.fieldHalf}
                    isFocused={focusedField === "nickname"}
                    hasError={nicknameError}
                    helperText={nicknameError ? "Nickname is required." : undefined}
                    onFocus={() => setFocusedField("nickname")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <Field
                  palette={palette}
                  textScale={type}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  isFocused={focusedField === "phone"}
                  hasError={phoneRequiredError || phoneFormatError}
                  helperText={
                    phoneRequiredError
                      ? "Phone number is required."
                      : phoneFormatError
                        ? "Use +639xxxxxxxxx or 09xxxxxxxxx."
                        : undefined
                  }
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                />
              </>
            ) : (
              <>
                <View style={styles.photoRow}>
                  <View style={[styles.avatarWrap, { borderColor: palette.cardBorder, backgroundColor: palette.inputBg, borderRadius: radius.xl + 13 }]}>
                    {pictureUrl ? (
                      <Image source={{ uri: pictureUrl }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <FontAwesome name="user" size={26} color="#6284A9" />
                    )}
                  </View>
                  <View style={styles.photoActions}>
                    <Text style={[styles.photoTitle, { color: palette.text, fontSize: type.label }]}>Profile photo</Text>
                    <Text style={[styles.uploadNote, { color: palette.subtext, fontSize: type.caption }]}>
                      Using your Google account photo for now.
                    </Text>
                  </View>
                </View>
                <View style={styles.fieldWrap}>
                  <Text style={[styles.birthdayLabel, { color: palette.text, fontSize: type.label }]}>Birthday</Text>
                  <View style={styles.birthdayRow}>
                    <SelectorField
                      value={birthMonth}
                      placeholder="Month *"
                      options={MONTH_OPTIONS}
                      onPress={() => {
                        setFocusedField("birthdayMonth");
                        setActiveBirthdayPicker("month");
                      }}
                      style={styles.monthSelector}
                      hasError={birthdayError}
                      isFocused={focusedField === "birthdayMonth"}
                    />
                    <SelectorField
                      value={birthDay}
                      placeholder="Day *"
                      options={DAY_OPTIONS}
                      onPress={() => {
                        setFocusedField("birthdayDay");
                        setActiveBirthdayPicker("day");
                      }}
                      style={styles.daySelector}
                      hasError={birthdayError}
                      isFocused={focusedField === "birthdayDay"}
                    />
                    <SelectorField
                      value={birthYear}
                      placeholder="Year *"
                      options={YEAR_OPTIONS}
                      onPress={() => {
                        setFocusedField("birthdayYear");
                        setActiveBirthdayPicker("year");
                      }}
                      style={styles.yearSelector}
                      hasError={birthdayError}
                      isFocused={focusedField === "birthdayYear"}
                    />
                  </View>
                  {birthdayError ? (
                    <Text style={[styles.inlineError, { color: palette.errorText, fontSize: type.caption }]}>
                      Birthday is required.
                    </Text>
                  ) : (
                    <Text style={[styles.inlineHelper, { color: palette.helperText, fontSize: type.caption }]}>
                      Choose month, day, and year.
                    </Text>
                  )}
                </View>
              </>
            )}

            {errorText ? <Text style={[styles.errorText, { fontSize: type.caption }]}>{errorText}</Text> : null}

            <View style={styles.buttonRow}>
              {formStep === 2 ? (
                <Pressable
                  style={[styles.backButton, { borderRadius: radius.md }]}
                  onPress={() => {
                    setStepTwoAttempted(false);
                    setFormStep(1);
                  }}
                >
                  <Text style={[styles.backText, { fontSize: type.body }]}>Back</Text>
                </Pressable>
              ) : (
                <View style={styles.backSpacer} />
              )}
              {formStep === 1 ? (
                <Pressable
                  style={[styles.submitButton, { borderRadius: radius.md, minHeight: 44 }, stepOneInvalid && styles.submitButtonDisabled]}
                  onPress={() => {
                    setStepOneAttempted(true);
                    if (stepOneInvalid) {
                      showDialog("Missing Required Fields", "Please complete all required profile fields before continuing.");
                      return;
                    }
                    setErrorText(null);
                    setStepTwoAttempted(false);
                    setFormStep(2);
                  }}
                >
                  <Text style={[styles.submitText, { fontSize: type.body }]}>Next</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.submitButton, { borderRadius: radius.md, minHeight: 44 }, (stepOneInvalid || stepTwoInvalid) && styles.submitButtonDisabled]}
                  onPress={() => {
                    setStepTwoAttempted(true);
                    if (stepTwoInvalid) {
                      showDialog("Birthday Required", "Please choose your birthday before continuing.");
                      return;
                    }
                    void submitProfile();
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#F8FBFF" />
                  ) : (
                    <Text style={[styles.submitText, { fontSize: type.body }]}>Continue</Text>
                  )}
                </Pressable>
              )}
            </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={activeBirthdayPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActiveBirthdayPicker(null);
          setFocusedField(null);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {activeBirthdayPicker === "month"
                ? "Select Month"
                : activeBirthdayPicker === "day"
                  ? "Select Day"
                  : "Select Year"}
            </Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {(activeBirthdayPicker === "month"
                ? MONTH_OPTIONS
                : activeBirthdayPicker === "day"
                  ? DAY_OPTIONS
                  : YEAR_OPTIONS
              ).map((option) => (
                <Pressable
                  key={`${activeBirthdayPicker}-${option.value}`}
                  style={styles.modalItem}
                  onPress={() => {
                    if (activeBirthdayPicker === "month") setBirthMonth(option.value);
                    if (activeBirthdayPicker === "day") setBirthDay(option.value);
                    if (activeBirthdayPicker === "year") setBirthYear(option.value);
                    setActiveBirthdayPicker(null);
                    setFocusedField(null);
                  }}>
                  <Text style={styles.modalItemText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={styles.modalClose}
              onPress={() => {
                setActiveBirthdayPicker(null);
                setFocusedField(null);
              }}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <AppDialog
        visible={dialogVisible}
        kind="error"
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

type FieldProps = {
  palette: {
    text: string;
    inputBg: string;
    inputBorder: string;
    inputText: string;
    focusBorder: string;
    focusGlow: string;
    errorBorder: string;
    helperText: string;
    errorText: string;
  };
  textScale: {
    body: number;
    caption: number;
  };
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  containerStyle?: object;
  isFocused?: boolean;
  hasError?: boolean;
  helperText?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  keyboardType?: "default" | "phone-pad" | "numbers-and-punctuation";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function Field({
  palette,
  textScale,
  value,
  onChangeText,
  placeholder,
  containerStyle,
  isFocused = false,
  hasError = false,
  helperText,
  onFocus,
  onBlur,
  keyboardType = "default",
  autoCapitalize = "none",
}: FieldProps) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          {
            backgroundColor: palette.inputBg,
            borderColor: hasError ? palette.errorBorder : isFocused ? palette.focusBorder : palette.inputBorder,
            color: palette.inputText,
            fontSize: textScale.body,
          },
          isFocused && { shadowColor: palette.focusGlow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
        ]}
        placeholder={placeholder}
        placeholderTextColor="#7493B2"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {helperText ? (
        <Text style={[styles.inlineHelper, { color: hasError ? palette.errorText : palette.helperText, fontSize: textScale.caption }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

function resolveAuthError(error: unknown) {
  if (error instanceof ApiError) {
    const payloadMessage =
      typeof error.payload === "object" && error.payload && "message" in error.payload
        ? String((error.payload as Record<string, unknown>).message ?? "")
        : "";
    return payloadMessage || `Unable to complete onboarding (${error.status}).`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete onboarding. Please try again.";
}

function composeBirthday(year: string, month: string, day: string): string | null {
  if (!year || !month || !day) {
    return null;
  }
  const input = `${year}-${month}-${day}`;
  const parsed = new Date(`${input}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const [yyyy, mm, dd] = [Number(year), Number(month), Number(day)];
  const valid =
    parsed.getFullYear() === yyyy &&
    parsed.getMonth() + 1 === mm &&
    parsed.getDate() === dd;
  return valid ? input : null;
}

function SelectorField({
  value,
  placeholder,
  options,
  onPress,
  style,
  hasError = false,
  isFocused = false,
}: {
  value: string;
  placeholder: string;
  options: SelectOption[];
  onPress: () => void;
  style?: object;
  hasError?: boolean;
  isFocused?: boolean;
}) {
  const label = options.find((item) => item.value === value)?.label ?? placeholder;
  const isPlaceholder = !value;
  return (
    <Pressable
      style={[
        styles.selectorField,
        style,
        hasError && styles.selectorFieldError,
        isFocused && styles.selectorFieldFocus,
      ]}
      onPress={onPress}>
      <Text style={[styles.selectorText, isPlaceholder && styles.selectorPlaceholder]} numberOfLines={1}>
        {label}
      </Text>
      <FontAwesome name="chevron-down" size={11} color="#5C7898" />
    </Pressable>
  );
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
    bottom: -110,
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
    paddingVertical: 20,
    alignItems: "center",
  },
  contentWrap: {
    width: "100%",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#C7D8EC",
    backgroundColor: "#F8FBFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  title: {
    color: "#0E2F54",
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "800",
  },
  subtitle: {
    color: "#4D6D8F",
    fontSize: 11,
    lineHeight: 14,
  },
  photoRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#C7D8EC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  photoActions: {
    flex: 1,
    gap: 4,
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    marginBottom: 2,
  },
  stepPill: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#DFEAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillActive: {
    backgroundColor: "#2F74E8",
  },
  stepPillText: {
    fontSize: 11,
    color: "#4D6D8F",
    fontWeight: "700",
  },
  stepPillTextActive: {
    color: "#F7FBFF",
  },
  photoTitle: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
  },
  uploadNote: {
    color: "#6A84A4",
    fontSize: 10,
    lineHeight: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 8,
  },
  fieldHalf: {
    flex: 1,
  },
  birthdayRow: {
    flexDirection: "row",
    gap: 8,
  },
  birthdayLabel: {
    color: "#2E5279",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  selectorField: {
    minHeight: 44,
    borderWidth: 1.1,
    borderColor: "#C8D9EE",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorFieldError: {
    borderColor: "#D64967",
  },
  selectorFieldFocus: {
    borderColor: "#2F74E8",
    shadowColor: "rgba(47,116,232,0.18)",
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  monthSelector: {
    flex: 1.5,
  },
  daySelector: {
    flex: 1,
  },
  yearSelector: {
    flex: 1.2,
  },
  selectorText: {
    fontSize: 13,
    color: "#0D2E52",
    fontWeight: "600",
  },
  selectorPlaceholder: {
    color: "#7493B2",
    fontWeight: "400",
  },
  input: {
    minHeight: 44,
    borderWidth: 1.1,
    borderColor: "#C8D9EE",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#0D2E52",
    fontSize: 13,
    fontWeight: "500",
  },
  inlineHelper: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    color: "#6A84A4",
  },
  inlineError: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    color: "#C03A56",
    fontWeight: "600",
  },
  errorText: {
    color: "#B20F2A",
    fontSize: 11,
    lineHeight: 14,
  },
  submitButton: {
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F74E8",
    flex: 1,
  },
  buttonRow: {
    marginTop: 2,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  backButton: {
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D3E3F6",
    paddingHorizontal: 14,
  },
  backText: {
    color: "#1A4B78",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  backSpacer: {
    width: 68,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: "#F8FBFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#F8FBFF",
    borderRadius: 14,
    padding: 14,
    maxHeight: "72%",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0E2F54",
    marginBottom: 10,
  },
  modalList: {
    maxHeight: 360,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D2DFEE",
  },
  modalItemText: {
    fontSize: 13,
    color: "#163A61",
  },
  modalClose: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalCloseText: {
    color: "#2F74E8",
    fontSize: 12,
    fontWeight: "700",
  },
});
