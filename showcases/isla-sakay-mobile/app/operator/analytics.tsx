import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  getCargoBookings,
  getPersonBookings,
  getPublicSchedules,
  type CargoBookingRecord,
  type PersonBookingRecord,
  type PublicScheduleConfig,
} from "@/services/api";

export default function OperatorAnalyticsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [schedules, setSchedules] = useState<PublicScheduleConfig[]>([]);
  const [personBookings, setPersonBookings] = useState<PersonBookingRecord[]>([]);
  const [cargoBookings, setCargoBookings] = useState<CargoBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAnalytics();
  }, [session]);

  async function loadAnalytics() {
    if (!session || session.principalType !== "BOAT_OPERATOR") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [scheduleData, person, cargo] = await Promise.all([
        getPublicSchedules(),
        getPersonBookings(session.accessToken),
        getCargoBookings(session.accessToken),
      ]);
      setSchedules(scheduleData);
      setPersonBookings(person);
      setCargoBookings(cargo);
    } catch (err) {
      if (err instanceof ApiError) setError(`Analytics failed (${err.status}).`);
      else if (err instanceof Error) setError(err.message);
      else setError("Unable to load operator analytics.");
    } finally {
      setIsLoading(false);
    }
  }

  const operatorSchedules = useMemo(() => {
    if (!session) return [];
    return schedules.filter((schedule) =>
      schedule.operatorId?.trim() === String(session.principalId)
      || schedule.operatorName?.trim().toLowerCase() === session.username.trim().toLowerCase(),
    );
  }, [schedules, session]);

  const stats = useMemo(() => {
    const routeCount = new Map<string, number>();
    const vesselCount = new Map<string, number>();
    let totalCapacity = 0;
    let totalBookedPassengers = 0;
    let completed = 0;
    let delayed = 0;

    for (const schedule of operatorSchedules) {
      const routeLabel = `${schedule.origin || "From"} -> ${schedule.destination || "Destination"}`;
      routeCount.set(routeLabel, (routeCount.get(routeLabel) ?? 0) + 1);
      vesselCount.set(schedule.boatName || schedule.route || "Unassigned vessel", (vesselCount.get(schedule.boatName || schedule.route || "Unassigned vessel") ?? 0) + 1);
      totalCapacity += schedule.capacity ?? 0;
      totalBookedPassengers += personBookings
        .filter((item) => item.scheduleId === schedule.id && item.status !== "cancelled")
        .reduce((sum, item) => sum + (item.numberOfPassengers || 0), 0);
      const status = normalizeStatus(schedule.tripStatus);
      if (status === "completed" || status === "arrived" || status === "delivered") completed += 1;
      if (status === "delayed") delayed += 1;
    }

    const topRoute = pickTop(routeCount);
    const topVessel = pickTop(vesselCount);
    const occupancy = totalCapacity > 0 ? Math.min((totalBookedPassengers / totalCapacity) * 100, 100) : 0;

    return {
      totalTrips: operatorSchedules.length,
      completedTrips: completed,
      delayedTrips: delayed,
      cargoTrips: operatorSchedules.filter((item) => item.boatType?.trim().toLowerCase() === "cargo").length,
      occupancy,
      topRoute,
      topVessel,
      cargoBookings: cargoBookings.filter((item) => operatorSchedules.some((schedule) => schedule.id === item.scheduleId)).length,
    };
  }, [cargoBookings, operatorSchedules, personBookings]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F4FAFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Pressable style={styles.iconButton} onPress={() => void loadAnalytics()}>
          <Ionicons name="refresh" size={22} color="#F4FAFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="small" color="#5CB8FF" />
            <Text style={styles.helper}>Loading operator analytics...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Analytics unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Operator Insights</Text>
              <Text style={styles.title}>Performance Snapshot</Text>
              <Text style={styles.subtitle}>A quick mobile view of your workload, trip mix, and route performance.</Text>
            </View>

            <View style={styles.grid}>
              <AnalyticCard label="Total Trips" value={`${stats.totalTrips}`} hint="All schedules under this operator" />
              <AnalyticCard label="Completed" value={`${stats.completedTrips}`} hint="Trips marked finished" />
              <AnalyticCard label="Delayed" value={`${stats.delayedTrips}`} hint="Trips with delay state" />
              <AnalyticCard label="Cargo Bookings" value={`${stats.cargoBookings}`} hint="Cargo reservations handled" />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Operational Highlights</Text>
              <View style={styles.highlightCard}>
                <Text style={styles.highlightLabel}>Approx. passenger occupancy</Text>
                <Text style={styles.highlightValue}>{stats.occupancy.toFixed(0)}%</Text>
                <Text style={styles.highlightHint}>Based on booked passenger count against declared vessel capacity.</Text>
              </View>
              <View style={styles.row}>
                <HighlightBox label="Top Route" value={stats.topRoute || "No route data yet"} />
                <HighlightBox label="Most Used Vessel" value={stats.topVessel || "No vessel data yet"} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnalyticCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

function HighlightBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.highlightBox}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={styles.boxValue}>{value}</Text>
    </View>
  );
}

function pickTop(counter: Map<string, number>) {
  let bestLabel = "";
  let bestValue = -1;
  for (const [label, value] of counter.entries()) {
    if (value > bestValue) {
      bestLabel = label;
      bestValue = value;
    }
  }
  return bestLabel;
}

function normalizeStatus(status?: string | null) {
  return status?.trim().toLowerCase() || "preparing";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071A2C" },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, backgroundColor: "#0C2238", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#12334F", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#F7FBFF", fontSize: 20, lineHeight: 24, fontWeight: "800" },
  content: { padding: 18, gap: 14, paddingBottom: 30 },
  centerCard: { borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 20, alignItems: "center", gap: 12 },
  helper: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  errorCard: { borderRadius: 22, borderWidth: 1, borderColor: "#5A2436", backgroundColor: "#26131B", padding: 18, gap: 8 },
  errorTitle: { color: "#FFD7DE", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  errorMessage: { color: "#FFB0BF", fontSize: 13, lineHeight: 18 },
  heroCard: { borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 6 },
  eyebrow: { color: "#76BDFC", fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  title: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  subtitle: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  grid: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  metricCard: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 12, gap: 4 },
  metricLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  metricValue: { color: "#F6FBFF", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  metricHint: { color: "#7B99B6", fontSize: 11, lineHeight: 15 },
  sectionCard: { borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 12 },
  sectionTitle: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  highlightCard: { borderRadius: 18, borderWidth: 1, borderColor: "#1E4A72", backgroundColor: "#0E2741", padding: 14, gap: 4 },
  highlightLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  highlightValue: { color: "#F6FBFF", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  highlightHint: { color: "#8FAFCC", fontSize: 12, lineHeight: 17 },
  row: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  highlightBox: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 12, gap: 4 },
  boxLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  boxValue: { color: "#F6FBFF", fontSize: 14, lineHeight: 18, fontWeight: "800" },
});
