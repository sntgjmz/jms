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

const ACTIVE_BOOKING_STATUSES = new Set([
  "pending",
  "pending_payment",
  "for_verification",
  "for_cash_collection",
  "confirmed",
]);
const FINISHED_TRIP_STATUSES = new Set(["completed", "arrived", "delivered", "cancelled"]);
const LIVE_OPERATOR_TRIP_STATUSES = new Set([
  "boarding",
  "final_call",
  "departure",
  "departed",
  "in_transit",
  "out_for_delivery",
  "delayed",
]);

type PendingTripCard = {
  schedule: PublicScheduleConfig;
  departureAt: Date | null;
  arrivalAt: Date | null;
  pendingPassengerBookings: number;
  pendingCargoBookings: number;
  totalPassengerBookings: number;
  totalCargoBookings: number;
  verifiedRevenue: number;
};

export default function OperatorPendingTripsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<PendingTripCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPending();
  }, [session]);

  async function loadPending() {
    if (!session || session.principalType !== "BOAT_OPERATOR") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [schedules, person, cargo] = await Promise.all([
        getPublicSchedules(),
        getPersonBookings(session.accessToken),
        getCargoBookings(session.accessToken),
      ]);
      const operatorSchedules = schedules.filter((schedule) =>
        schedule.operatorId?.trim() === String(session.principalId)
        || schedule.operatorName?.trim().toLowerCase() === session.username.trim().toLowerCase(),
      );

      const mapped = operatorSchedules
        .map((schedule) => {
          const personForSchedule = person.filter((item) => item.scheduleId === schedule.id);
          const cargoForSchedule = cargo.filter((item) => item.scheduleId === schedule.id);
          return {
            schedule,
            departureAt: toDateValue(schedule.departureDatetime ?? schedule.departure),
            arrivalAt: toDateValue(schedule.arrivalDatetime ?? schedule.arrival),
            pendingPassengerBookings: personForSchedule.filter((item) => ACTIVE_BOOKING_STATUSES.has(item.status)).length,
            pendingCargoBookings: cargoForSchedule.filter((item) => ACTIVE_BOOKING_STATUSES.has(item.status)).length,
            totalPassengerBookings: personForSchedule.length,
            totalCargoBookings: cargoForSchedule.length,
            verifiedRevenue: sumRevenue(personForSchedule) + sumRevenue(cargoForSchedule),
          };
        })
        .filter((item) => {
          const status = normalizeStatus(item.schedule.tripStatus);
          if (FINISHED_TRIP_STATUSES.has(status)) return false;
          if (LIVE_OPERATOR_TRIP_STATUSES.has(status)) return true;
          if (!item.departureAt) return false;
          return item.departureAt.getTime() >= Date.now();
        })
        .sort((left, right) => (left.departureAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.departureAt?.getTime() ?? Number.MAX_SAFE_INTEGER));

      setItems(mapped);
    } catch (err) {
      if (err instanceof ApiError) setError(`Pending trips failed (${err.status}).`);
      else if (err instanceof Error) setError(err.message);
      else setError("Unable to load pending trips.");
    } finally {
      setIsLoading(false);
    }
  }

  const queueTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.pendingPassengerBookings + item.pendingCargoBookings, 0),
    [items],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F4FAFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Pending Trips</Text>
        <Pressable style={styles.iconButton} onPress={() => void loadPending()}>
          <Ionicons name="refresh" size={22} color="#F4FAFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.eyebrow}>Dispatch Queue</Text>
          <Text style={styles.summaryTitle}>Upcoming & Active Schedules</Text>
          <Text style={styles.summaryCopy}>Only assigned trips for this operator are shown here. Queue total: {queueTotal}</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="small" color="#5CB8FF" />
            <Text style={styles.helper}>Loading pending trips...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Pending trips unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerCard}>
            <Text style={styles.helper}>No pending or active schedules right now.</Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.schedule.id}
              style={styles.tripCard}
              onPress={() => router.push({ pathname: "/operator/trip-execution", params: { scheduleId: item.schedule.id } })}
            >
              <View style={styles.tripHeader}>
                <View style={styles.tripCopy}>
                  <Text style={styles.tripTitle}>{item.schedule.boatName || item.schedule.route}</Text>
                  <Text style={styles.tripRoute}>{item.schedule.origin || "From"} {"->"} {item.schedule.destination || "Destination"}</Text>
                </View>
                <View style={[styles.statusPill, statusPillStyle(normalizeStatus(item.schedule.tripStatus))]}>
                  <Text style={styles.statusPillText}>{statusLabel(item.schedule.tripStatus)}</Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaCard}>
                  <Text style={styles.metaLabel}>Window</Text>
                  <Text style={styles.metaValue}>{formatScheduleDate(item.departureAt)}</Text>
                  <Text style={styles.metaHint}>{formatTimeRange(item.departureAt, item.arrivalAt)}</Text>
                </View>
                <View style={styles.metaCard}>
                  <Text style={styles.metaLabel}>Queue</Text>
                  <Text style={styles.metaValue}>{item.pendingPassengerBookings + item.pendingCargoBookings}</Text>
                  <Text style={styles.metaHint}>{item.pendingPassengerBookings} passenger | {item.pendingCargoBookings} cargo</Text>
                </View>
                <View style={styles.metaCard}>
                  <Text style={styles.metaLabel}>Bookings</Text>
                  <Text style={styles.metaValue}>{item.totalPassengerBookings + item.totalCargoBookings}</Text>
                  <Text style={styles.metaHint}>{item.totalPassengerBookings} passenger | {item.totalCargoBookings} cargo</Text>
                </View>
                <View style={styles.metaCard}>
                  <Text style={styles.metaLabel}>Revenue</Text>
                  <Text style={styles.metaValue}>{formatCurrency(item.verifiedRevenue)}</Text>
                  <Text style={styles.metaHint}>Verified under this trip</Text>
                </View>
              </View>

              <Text style={styles.tapHint}>Tap to open trip execution</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeStatus(status?: string | null) {
  return status?.trim().toLowerCase() || "preparing";
}
function toDateValue(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function formatScheduleDate(value: Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(value);
}
function formatTimeRange(start: Date | null, end: Date | null) {
  const formatter = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });
  return `${start ? formatter.format(start) : "--"} - ${end ? formatter.format(end) : "--"}`;
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value || 0);
}
function statusLabel(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "boarding": return "Boarding";
    case "final_call": return "Final Call";
    case "departure":
    case "departed": return "Departed";
    case "in_transit": return "In Transit";
    case "out_for_delivery": return "Out for Delivery";
    case "arrived": return "Arrived";
    case "completed": return "Completed";
    case "delivered": return "Delivered";
    case "delayed": return "Delayed";
    case "cancelled": return "Cancelled";
    default: return "Preparing";
  }
}
function statusPillStyle(status: string) {
  if (status === "delayed") return { backgroundColor: "#4B3410", borderColor: "#9B6A20" };
  if (status === "boarding" || status === "final_call") return { backgroundColor: "#123859", borderColor: "#2F74E8" };
  if (status === "in_transit" || status === "out_for_delivery" || status === "departure" || status === "departed") return { backgroundColor: "#103D38", borderColor: "#29C29A" };
  if (status === "completed" || status === "arrived" || status === "delivered") return { backgroundColor: "#143321", borderColor: "#44C276" };
  if (status === "cancelled") return { backgroundColor: "#3A1D26", borderColor: "#C94F6D" };
  return { backgroundColor: "#15324D", borderColor: "#315D88" };
}
function sumRevenue(items: Array<PersonBookingRecord | CargoBookingRecord>) {
  return items.reduce((sum, item) => item.paymentStatus === "verified" ? sum + (item.totalAmount || 0) : sum, 0);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071A2C" },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14, backgroundColor: "#0C2238", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#12334F", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#F7FBFF", fontSize: 20, lineHeight: 24, fontWeight: "800" },
  content: { padding: 18, gap: 14, paddingBottom: 30 },
  summaryCard: { borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 6 },
  eyebrow: { color: "#76BDFC", fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  summaryTitle: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  summaryCopy: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  centerCard: { borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 20, alignItems: "center", gap: 12 },
  helper: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  errorCard: { borderRadius: 22, borderWidth: 1, borderColor: "#5A2436", backgroundColor: "#26131B", padding: 18, gap: 8 },
  errorTitle: { color: "#FFD7DE", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  errorMessage: { color: "#FFB0BF", fontSize: 13, lineHeight: 18 },
  tripCard: { borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 16, gap: 12 },
  tripHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  tripCopy: { flex: 1, gap: 4 },
  tripTitle: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  tripRoute: { color: "#B4CAE0", fontSize: 13, lineHeight: 17, fontWeight: "600" },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  statusPillText: { color: "#F7FBFF", fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  metaGrid: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  metaCard: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 12, gap: 4 },
  metaLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  metaValue: { color: "#F6FBFF", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  metaHint: { color: "#7B99B6", fontSize: 11, lineHeight: 15 },
  tapHint: { color: "#6FB9FF", fontSize: 11, lineHeight: 15, fontWeight: "700" },
});
