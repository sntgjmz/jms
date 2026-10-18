import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { ApiError, getAppUserById, type AppUserProfile } from "@/services/api";

export default function UserProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!session || session.principalType !== "USER") {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getAppUserById(session.principalId, session.accessToken);
        setProfile(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Profile request failed (${err.status}).`);
        } else {
          setError("Unable to load profile.");
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [session]);

  const fullName = useMemo(() => {
    const first = profile?.firstName ?? "";
    const last = profile?.lastName ?? "";
    const merged = `${first} ${last}`.trim();
    if (merged) return merged;
    return profile?.nickname || session?.username || "Passenger";
  }, [profile?.firstName, profile?.lastName, profile?.nickname, session?.username]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.topBar, { paddingTop: Math.max(0, insets.top * 0.1) }]}>
        <Pressable style={styles.topBtn} onPress={() => router.back()} android_ripple={{ color: "rgba(255,255,255,0.2)" }}>
          <Ionicons name="arrow-back" size={21} color="#F5FAFF" />
        </Pressable>
        <Text style={styles.topTitle}>Profile</Text>
        <Pressable style={styles.topBtn} android_ripple={{ color: "rgba(255,255,255,0.2)" }}>
          <Ionicons name="id-card-outline" size={19} color="#F5FAFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        {loading ? (
          <ActivityIndicator size="small" color="#2F74E8" />
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.avatarCircle}>
                <FontAwesome name="user-circle-o" size={78} color="#0C2338" />
              </View>
              <Text style={styles.nameText}>{fullName}</Text>
              <Text style={styles.emailText}>{profile?.email || "-"}</Text>
              <Pressable style={styles.photoButton} android_ripple={{ color: "#CCE0F6" }}>
                <Text style={styles.photoButtonText}>Isla Sakay</Text>
              </Pressable>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <InfoRow label="Nickname" value={profile?.nickname || "Not set"} />
              <InfoRow label="Birthday" value={formatBirthday(profile?.birthday)} />
              <InfoRow label="Phone Number" value={profile?.phone || "Not set"} />
              <InfoRow label="Gender" value="Not set" />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatBirthday(value?: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#DDE6F2",
  },
  topBar: {
    minHeight: 80,
    backgroundColor: "#0B3A5D",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#2B567A",
  },
  topBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    overflow: "hidden",
  },
  topTitle: {
    color: "#F6FBFF",
    fontSize: 19,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: "#F6FAFF",
    borderWidth: 1,
    borderColor: "#CFE0F2",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FC",
    borderWidth: 1,
    borderColor: "#CFE0F2",
  },
  nameText: {
    fontSize: 22,
    lineHeight: 26,
    color: "#17334F",
    fontWeight: "800",
    textAlign: "center",
  },
  emailText: {
    fontSize: 13,
    lineHeight: 17,
    color: "#466380",
    textAlign: "center",
  },
  photoButton: {
    marginTop: 4,
    minHeight: 38,
    borderRadius: 20,
    backgroundColor: "#EAF3FD",
    borderWidth: 1,
    borderColor: "#C8DCF2",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoButtonText: {
    color: "#1E4266",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "#F6FAFF",
    borderWidth: 1,
    borderColor: "#CFE0F2",
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    color: "#1E4266",
    fontWeight: "800",
    marginBottom: 2,
  },
  infoRow: {
    backgroundColor: "#EEF4FC",
    borderWidth: 1,
    borderColor: "#D8E5F3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: "#5A7490",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 19,
    color: "#1A3652",
    fontWeight: "700",
  },
  error: {
    marginTop: 8,
    color: "#B20F2A",
    fontSize: 12,
    lineHeight: 16,
  },
});
