import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { ApiError, getPublicContact, type PublicContactConfig } from "@/services/api";

type ContactCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
};

function ContactCard({ icon, label, value, hint, onPress }: ContactCardProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.contactCard, pressed && onPress ? styles.contactCardPressed : null]}>
      <View style={styles.contactIconWrap}>
        <Ionicons name={icon} size={20} color="#9FD2FF" />
      </View>
      <View style={styles.contactTextWrap}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value || "-"}</Text>
        {hint ? <Text style={styles.contactHint}>{hint}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color="#87A9C9" /> : null}
    </Pressable>
  );
}

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [contact, setContact] = useState<PublicContactConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadContact() {
      setLoading(true);
      setError(null);
      try {
        const payload = await getPublicContact();
        if (!mounted) return;
        setContact(payload);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof ApiError) {
          setError(`Support info failed to load (${err.status}).`);
        } else {
          setError("Unable to load support details right now.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadContact();
    return () => {
      mounted = false;
    };
  }, []);

  function showDialog(title: string, message: string) {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  }

  async function openLink(url: string, fallbackTitle: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showDialog(fallbackTitle, "This action is not available on your device right now.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      showDialog(fallbackTitle, "We couldn't open that action right now. Please try again later.");
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(6, insets.top * 0.08) }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF4FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Support / Feedback</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(28, insets.bottom + 18) }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Need help with Isla Sakay?</Text>
          <Text style={styles.heroSubtitle}>
            These contact details are managed by the admin portal and update here automatically whenever
            your support team changes them.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Channels</Text>
          <Text style={styles.sectionBody}>
            Reach the Isla Sakay team for booking concerns, payment verification help, trip updates, and
            general assistance.
          </Text>

          {loading ? <Text style={styles.loadingText}>Loading support details…</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!loading && !error && contact ? (
            <View style={styles.contactList}>
              <ContactCard
                icon="call-outline"
                label="Phone"
                value={contact.phone}
                hint="Tap to call"
                onPress={() => openLink(`tel:${contact.phone}`, "Call support")}
              />
              <ContactCard
                icon="mail-outline"
                label="Email"
                value={contact.email}
                hint="Tap to compose"
                onPress={() => openLink(`mailto:${contact.email}`, "Email support")}
              />
              <ContactCard
                icon="time-outline"
                label="Office Hours"
                value={contact.officeHours}
              />
              <ContactCard
                icon="location-outline"
                label="Office Address"
                value={contact.officeAddress}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Quick Guidance</Text>
          <View style={styles.tipList}>
            <Text style={styles.tipItem}>Use phone support for urgent trip and schedule concerns.</Text>
            <Text style={styles.tipItem}>Use email when sending detailed questions or screenshots.</Text>
            <Text style={styles.tipItem}>For payment issues, include your booking reference when contacting support.</Text>
          </View>
        </View>
      </ScrollView>

      <AppDialog
        visible={dialogVisible}
        kind="info"
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#071A2D",
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#103454",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#F1F8FF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#224D73",
    backgroundColor: "#0B2741",
    padding: 18,
  },
  heroTitle: {
    color: "#F5FAFF",
    fontSize: 24,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#B8D1E7",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#224D73",
    backgroundColor: "#0B2741",
    padding: 16,
  },
  sectionTitle: {
    color: "#F1F8FF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  sectionBody: {
    color: "#C7DBEE",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  loadingText: {
    color: "#DCEAF8",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#FF8298",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  contactList: {
    gap: 10,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#224D73",
    backgroundColor: "#0D3150",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactCardPressed: {
    opacity: 0.9,
  },
  contactIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#123E65",
    borderWidth: 1,
    borderColor: "#2B618F",
  },
  contactTextWrap: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    color: "#8FC8FF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  contactValue: {
    color: "#F4FAFF",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
  },
  contactHint: {
    color: "#AFC6DD",
    fontSize: 12,
    lineHeight: 16,
  },
  sectionEyebrow: {
    color: "#8FC8FF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  tipList: {
    gap: 10,
  },
  tipItem: {
    color: "#D6E6F6",
    fontSize: 14,
    lineHeight: 20,
  },
});
