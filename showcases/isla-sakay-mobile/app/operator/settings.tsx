import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  getBoatOperatorById,
  getBoats,
  type BoatOperatorProfile,
  type BoatRecord,
  updateBoatStatus,
} from "@/services/api";

export default function OperatorSettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = useState<BoatOperatorProfile | null>(null);
  const [boats, setBoats] = useState<BoatRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, [session]);

  async function loadSettings() {
    if (!session || session.principalType !== "BOAT_OPERATOR") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [operatorProfile, boatRecords] = await Promise.all([
        getBoatOperatorById(session.principalId, session.accessToken),
        getBoats(session.accessToken),
      ]);
      setProfile(operatorProfile);
      setBoats(boatRecords);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Unable to load operator settings (${err.status}).`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load operator settings.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const assignedBoats = useMemo(() => {
    const principalId = String(session?.principalId ?? "").trim();
    const fullName = profile?.fullName?.trim().toLowerCase() ?? "";
    const username = session?.username?.trim().toLowerCase() ?? "";
    return boats.filter((boat) => {
      const ids = (boat.operatorIds ?? []).map((item) => item.trim());
      const names = (boat.operatorNames ?? []).map((item) => item.trim().toLowerCase());
      const boatOperatorName = boat.operatorName?.trim().toLowerCase() ?? "";
      const idMatch = principalId.length > 0 && (boat.operatorId?.trim() === principalId || ids.includes(principalId));
      const nameMatch = (fullName.length > 0 && (boatOperatorName === fullName || names.includes(fullName)))
        || (username.length > 0 && boatOperatorName === username);
      return idMatch || nameMatch;
    });
  }, [boats, profile?.fullName, session?.principalId, session?.username]);

  const primaryBoat = assignedBoats[0] ?? null;
  const isOnline = primaryBoat ? normalizeBoatStatus(primaryBoat.status) === "registered" : false;
  const availabilityLabel = isOnline ? "Online" : "Offline";
  const capacityLabel = primaryBoat
    ? primaryBoat.type?.trim().toLowerCase() === "cargo"
      ? `${primaryBoat.capacity ?? "-"} kg`
      : `${primaryBoat.availableSeats ?? primaryBoat.capacity ?? "-"} / ${primaryBoat.capacity ?? "-"}`
    : "No vessel assigned";

  async function onToggleAvailability() {
    if (!session || !primaryBoat) return;
    setIsUpdating(true);
    setError(null);
    try {
      const nextStatus = isOnline ? "maintenance" : "registered";
      const updated = await updateBoatStatus(session.accessToken, primaryBoat.id, nextStatus);
      setBoats((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(extractApiMessage(err.payload) || `Availability update failed (${err.status}).`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to update vessel availability.");
      }
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F4FAFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Operator Settings</Text>
        <Pressable style={styles.iconButton} onPress={() => void loadSettings()}>
          <Ionicons name="refresh" size={22} color="#F4FAFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="small" color="#5CB8FF" />
            <Text style={styles.helper}>Loading operator settings...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Settings unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons name="account-tie" size={38} color="#103A61" />
              </View>
              <Text style={styles.name}>{profile?.fullName ?? session?.username ?? "Boat Operator"}</Text>
              <Text style={styles.subtitle}>
                {profile?.operatorType ? `${toTitleCase(profile.operatorType)} operator` : "Assigned operator"} / {profile?.licenseNumber ?? "License pending"}
              </Text>
              <View style={[styles.presencePill, profile?.isOnline ? styles.presenceOnline : styles.presenceOffline]}>
                <Text style={styles.presenceText}>{profile?.isOnline ? "Online now" : "Offline"}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.eyebrow}>Operator Profile</Text>
              <Text style={styles.sectionTitle}>Profile Management</Text>
              <InfoRow icon="person-outline" label="Username" value={profile?.username ?? session?.username ?? "-"} />
              <InfoRow icon="mail-outline" label="Email" value={profile?.email ?? "-"} />
              <InfoRow icon="call-outline" label="Contact Number" value={profile?.contactNumber ?? "-"} />
              <InfoRow icon="calendar-outline" label="Birthday" value={formatDate(profile?.birthday)} />
              <InfoRow icon="time-outline" label="Last Login" value={formatDateTime(profile?.lastLoginAt)} />
            </View>

            <View style={styles.card}>
              <Text style={styles.eyebrow}>Assigned Vessel</Text>
              <Text style={styles.sectionTitle}>Vessel Details</Text>
              {primaryBoat ? (
                <>
                  <View style={styles.vesselHero}>
                    <View style={styles.vesselBadge}>
                      <Ionicons
                        name={primaryBoat.type?.trim().toLowerCase() === "cargo" ? "cube-outline" : "boat-outline"}
                        size={22}
                        color="#EAF6FF"
                      />
                    </View>
                    <View style={styles.vesselCopy}>
                      <Text style={styles.vesselName}>{primaryBoat.name}</Text>
                      <Text style={styles.vesselMeta}>
                        {toTitleCase(primaryBoat.type || "banca")} / {primaryBoat.registrationNumber || "No registry number"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.grid}>
                    <StatCard label="Capacity" value={capacityLabel} />
                    <StatCard label="Routes" value={`${primaryBoat.routeNames?.length ?? 0}`} />
                    <StatCard label="Banca Status" value={toTitleCase(primaryBoat.bancaTripStatus ?? "preparing")} />
                    <StatCard label="Cargo Status" value={toTitleCase(primaryBoat.cargoTripStatus ?? "preparing")} />
                  </View>

                  <Text style={styles.vesselHint}>
                    Assigned vessels: {assignedBoats.length}. Toggle availability below to block or reopen this vessel for active service.
                  </Text>

                  {assignedBoats.length > 1 ? (
                    <View style={styles.assignedList}>
                      <Text style={styles.assignedHeading}>All Assigned Vessels</Text>
                      {assignedBoats.map((boat) => (
                        <View key={boat.id} style={styles.assignedBoatCard}>
                          <View style={styles.assignedBoatHeader}>
                            <Text style={styles.assignedBoatName}>{boat.name}</Text>
                            <View style={[styles.assignedStatusPill, normalizeBoatStatus(boat.status) === "registered" ? styles.availabilityOnline : styles.availabilityOffline]}>
                              <Text style={styles.availabilityPillText}>{normalizeBoatStatus(boat.status) === "registered" ? "Online" : "Offline"}</Text>
                            </View>
                          </View>
                          <Text style={styles.assignedBoatMeta}>
                            {toTitleCase(boat.type || "banca")} | {boat.registrationNumber || "No registry"} | Routes: {boat.routeNames?.join(", ") || "None assigned"}
                          </Text>
                          <Text style={styles.assignedBoatMeta}>
                            Last maintenance: {formatDate(boat.lastMaintenance)} | Next maintenance: {formatDate(boat.nextMaintenance)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.helper}>No assigned vessel was found for this operator yet.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.eyebrow}>Service Control</Text>
              <Text style={styles.sectionTitle}>Availability</Text>
              <Text style={styles.availabilityLabel}>Current service state</Text>
              <View style={styles.availabilityRow}>
                <View style={[styles.availabilityPill, isOnline ? styles.availabilityOnline : styles.availabilityOffline]}>
                  <Text style={styles.availabilityPillText}>{availabilityLabel}</Text>
                </View>
                <Text style={styles.availabilityCopy}>
                  {isOnline
                    ? "The vessel is available for service and can continue scheduled trips."
                    : "The vessel is temporarily unavailable for service until you bring it back online."}
                </Text>
              </View>

              <Pressable
                style={[
                  styles.toggleButton,
                  isOnline ? styles.toggleOfflineButton : styles.toggleOnlineButton,
                  (!primaryBoat || isUpdating) && styles.toggleDisabled,
                ]}
                onPress={() => void onToggleAvailability()}
                disabled={!primaryBoat || isUpdating}
              >
                <Text style={styles.toggleButtonText}>
                  {isUpdating ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
                </Text>
              </Pressable>

              <Text style={styles.vesselHint}>
                Online maps to vessel status `registered`. Offline maps to `maintenance` so dispatch can clearly hide the vessel from active service.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#6FB9FF" />
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function normalizeBoatStatus(status?: string | null) {
  return status?.trim().toLowerCase() || "registered";
}

function extractApiMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { message?: string; error?: string }).message ?? (payload as { error?: string }).error;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return null;
}

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function formatDateTime(value?: string | null) {
  if (!value) return "No login activity yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071A2C" },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#0C2238",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#12334F",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#F7FBFF", fontSize: 20, lineHeight: 24, fontWeight: "800" },
  content: { padding: 18, gap: 14, paddingBottom: 30 },
  centerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#173753",
    backgroundColor: "#0C2238",
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  helper: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  errorCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#5A2436",
    backgroundColor: "#26131B",
    padding: 18,
    gap: 8,
  },
  errorTitle: { color: "#FFD7DE", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  errorMessage: { color: "#FFB0BF", fontSize: 13, lineHeight: 18 },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#173753",
    backgroundColor: "#0C2238",
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#F4FAFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: "#F7FBFF", fontSize: 20, lineHeight: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#90AFCB", fontSize: 13, lineHeight: 18, textAlign: "center" },
  presencePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presenceOnline: { backgroundColor: "#103D38", borderColor: "#29C29A" },
  presenceOffline: { backgroundColor: "#3D1B23", borderColor: "#8F3449" },
  presenceText: { color: "#F7FBFF", fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#173753",
    backgroundColor: "#0C2238",
    padding: 18,
    gap: 12,
  },
  eyebrow: { color: "#76BDFC", fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  sectionTitle: { color: "#F7FBFF", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1A3B5A",
    backgroundColor: "#13304B",
    padding: 12,
  },
  infoCopy: { flex: 1, gap: 2 },
  infoLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  infoValue: { color: "#F6FBFF", fontSize: 13, lineHeight: 17, fontWeight: "700" },
  vesselHero: { flexDirection: "row", alignItems: "center", gap: 12 },
  vesselBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#18476C",
    alignItems: "center",
    justifyContent: "center",
  },
  vesselCopy: { flex: 1, gap: 2 },
  vesselName: { color: "#F7FBFF", fontSize: 17, lineHeight: 21, fontWeight: "800" },
  vesselMeta: { color: "#90AFCB", fontSize: 12, lineHeight: 16 },
  grid: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  statCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1A3B5A",
    backgroundColor: "#13304B",
    padding: 12,
    gap: 4,
  },
  statLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  statValue: { color: "#F6FBFF", fontSize: 15, lineHeight: 19, fontWeight: "800" },
  assignedList: { gap: 10, marginTop: 4 },
  assignedHeading: { color: "#D8EBFA", fontSize: 12, lineHeight: 16, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  assignedBoatCard: { borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 12, gap: 6 },
  assignedBoatHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  assignedBoatName: { color: "#F7FBFF", fontSize: 15, lineHeight: 19, fontWeight: "800", flex: 1 },
  assignedBoatMeta: { color: "#90AFCB", fontSize: 12, lineHeight: 17 },
  assignedStatusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  availabilityLabel: { color: "#8FAFCC", fontSize: 12, lineHeight: 16, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  availabilityRow: { gap: 8 },
  availabilityPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  availabilityOnline: { backgroundColor: "#103D38", borderColor: "#29C29A" },
  availabilityOffline: { backgroundColor: "#4B3410", borderColor: "#9B6A20" },
  availabilityPillText: { color: "#F7FBFF", fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  availabilityCopy: { color: "#CFE0F0", fontSize: 13, lineHeight: 18 },
  toggleButton: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  toggleOnlineButton: { backgroundColor: "#2F74E8" },
  toggleOfflineButton: { backgroundColor: "#A36225" },
  toggleDisabled: { opacity: 0.45 },
  toggleButtonText: { color: "#FFFFFF", fontSize: 13, lineHeight: 16, fontWeight: "800" },
  vesselHint: { color: "#90AFCB", fontSize: 12, lineHeight: 17 },
});
