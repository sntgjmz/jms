import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  getMyCargoBookings,
  getMyPersonBookings,
  getPublicSchedules,
  type CargoBookingRecord,
  type PersonBookingRecord,
  type PublicScheduleConfig,
} from "@/services/api";

type DialogKind = "info" | "error" | "success";
type HistoryItem = {
  id: string;
  kind: "boat" | "cargo";
  title: string;
  route: string;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
  tripDateTime: Date | null;
  amount: number;
  detailLabel: string;
  operatorName?: string | null;
  scheduleStatus?: string | null;
  departureDatetime?: string | null;
  arrivalDatetime?: string | null;
};

function isPastHistoryItem(item: HistoryItem, nowMs: number = Date.now()) {
  const booking = item.bookingStatus.toLowerCase();
  const schedule = (item.scheduleStatus ?? "").toLowerCase();
  if (["completed", "cancelled"].includes(booking)) return true;
  if (["completed", "arrived", "cancelled", "departure", "departed"].includes(schedule)) return true;

  const referenceMs =
    (item.arrivalDatetime ? new Date(item.arrivalDatetime).getTime() : Number.NaN) ||
    (item.departureDatetime ? new Date(item.departureDatetime).getTime() : Number.NaN) ||
    (item.tripDateTime?.getTime() ?? Number.NaN);

  if (!Number.isNaN(referenceMs) && referenceMs < nowMs) return true;
  return false;
}

function toDateTime(date?: string | null, time?: string | null) {
  if (!date) return null;
  const value = time ? `${date}T${time}` : `${date}T00:00:00`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatPeso(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "PHP --";
  return `PHP ${value.toFixed(2)}`;
}

function formatDateTime(value?: Date | null) {
  if (!value) return "Schedule pending";
  return value.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toPastStatusLabel(item: HistoryItem) {
  const schedule = (item.scheduleStatus ?? "").toLowerCase();
  const booking = item.bookingStatus.toLowerCase();
  const payment = item.paymentStatus.toLowerCase();

  if (schedule === "completed" || booking === "completed") return "Completed";
  if (schedule === "arrived") return "Arrived";
  if (booking === "cancelled" || schedule === "cancelled") return "Cancelled";
  if (payment === "rejected") return "Payment rejected";
  return "Past trip";
}

function buildHistoryItems(
  person: PersonBookingRecord[],
  cargo: CargoBookingRecord[],
  schedules: PublicScheduleConfig[],
) {
  const scheduleMap = new Map<string, PublicScheduleConfig>();
  schedules.forEach((schedule) => {
    if (schedule.id) scheduleMap.set(schedule.id, schedule);
  });

  const personItems: HistoryItem[] = person.map((booking) => {
    const schedule = booking.scheduleId ? scheduleMap.get(booking.scheduleId) : undefined;
    return {
      id: booking.id,
      kind: "boat",
      title: booking.scheduleLabel?.trim() || booking.boatId?.trim() || "Boat booking",
      route: `${booking.origin} -> ${booking.destination}`,
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      tripDateTime: toDateTime(booking.date, booking.time),
      amount: booking.totalAmount,
      detailLabel: `${booking.numberOfPassengers} passenger${booking.numberOfPassengers > 1 ? "s" : ""}`,
      operatorName: schedule?.operatorName,
      scheduleStatus: schedule?.tripStatus,
      departureDatetime: schedule?.departureDatetime ?? null,
      arrivalDatetime: schedule?.arrivalDatetime ?? null,
    };
  });

  const cargoItems: HistoryItem[] = cargo.map((booking) => {
    const schedule = booking.scheduleId ? scheduleMap.get(booking.scheduleId) : undefined;
    return {
      id: booking.id,
      kind: "cargo",
      title: booking.scheduleLabel?.trim() || booking.boatId?.trim() || "Cargo booking",
      route: `${booking.origin} -> ${booking.destination}`,
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      tripDateTime: toDateTime(booking.date, undefined),
      amount: booking.totalAmount,
      detailLabel: `${booking.weight} kg cargo`,
      operatorName: schedule?.operatorName,
      scheduleStatus: schedule?.tripStatus,
      departureDatetime: schedule?.departureDatetime ?? null,
      arrivalDatetime: schedule?.arrivalDatetime ?? null,
    };
  });

  return [...personItems, ...cargoItems].sort((left, right) => {
    const leftTs = left.tripDateTime?.getTime() ?? new Date(left.createdAt).getTime();
    const rightTs = right.tripDateTime?.getTime() ?? new Date(right.createdAt).getTime();
    return rightTs - leftTs;
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (!session?.accessToken) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [person, cargo, schedules] = await Promise.all([
        getMyPersonBookings(session.accessToken),
        getMyCargoBookings(session.accessToken),
        getPublicSchedules(),
      ]);
      setItems(buildHistoryItems(person, cargo, schedules));
    } catch (error) {
      setDialogKind("error");
      setDialogTitle("Unable to load history");
      setDialogMessage(error instanceof ApiError ? `Could not fetch your trip history (${error.status}).` : "Could not fetch your trip history.");
      setDialogVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const pastItems = useMemo(
    () => items.filter((item) => isPastHistoryItem(item)),
    [items],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top * 0.35) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF6FF" />
        </Pressable>
        <Text style={styles.headerTitle}>History</Text>
        <Pressable style={styles.backBtn} onPress={() => void loadHistory(true)}>
          <Ionicons name="refresh" size={16} color="#DCEEFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Completed and past trips</Text>
          <Text style={styles.text}>This module is for finished, arrived, cancelled, and past booking records only.</Text>
          <Text style={styles.heroCount}>{pastItems.length} archived</Text>
        </View>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator color="#9ED2FF" />
            <Text style={styles.text}>Loading your trip history...</Text>
          </View>
        ) : pastItems.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.title}>No past trips yet</Text>
            <Text style={styles.text}>Your completed and past bookings will appear here once trips are finished or closed.</Text>
          </View>
        ) : (
          pastItems.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{toPastStatusLabel(item)}</Text>
                </View>
              </View>
              <Text style={styles.historyRoute}>{item.route}</Text>
              <View style={styles.metaGrid}>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Trip time</Text>
                  <Text style={styles.metaValue}>{formatDateTime(item.tripDateTime)}</Text>
                </View>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Booking</Text>
                  <Text style={styles.metaValue}>{item.detailLabel}</Text>
                </View>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Amount</Text>
                  <Text style={styles.metaValue}>{formatPeso(item.amount)}</Text>
                </View>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Payment</Text>
                  <Text style={styles.metaValue}>{item.paymentStatus.replace(/_/g, " ")}</Text>
                </View>
              </View>
              {item.operatorName ? <Text style={styles.operator}>Operator: {item.operatorName}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <AppDialog
        visible={dialogVisible}
        kind={dialogKind}
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071A2D" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#0D2E4A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#EAF6FF", fontSize: 17, fontWeight: "800" },
  content: { paddingHorizontal: 16, gap: 12 },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 16,
    gap: 8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 16,
    gap: 8,
    alignItems: "center",
  },
  title: { color: "#F2F8FF", fontSize: 18, fontWeight: "800" },
  text: { color: "#B8D0E6", fontSize: 13, lineHeight: 19 },
  heroCount: { color: "#9FD2FF", fontSize: 14, fontWeight: "800" },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#214A6B",
    backgroundColor: "#0B2741",
    padding: 14,
    gap: 10,
  },
  historyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  historyTitle: {
    flex: 1,
    color: "#F2F8FF",
    fontSize: 15,
    fontWeight: "800",
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2D7460",
    backgroundColor: "#183A31",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: "#CCF7E8",
    fontSize: 11,
    fontWeight: "800",
  },
  historyRoute: {
    color: "#D1E4F6",
    fontSize: 13,
    fontWeight: "700",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaBlock: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1D4260",
    backgroundColor: "#0A2238",
    padding: 10,
    gap: 4,
  },
  metaLabel: {
    color: "#95B7D6",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    color: "#EAF6FF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  operator: {
    color: "#D5E7F8",
    fontSize: 12,
    fontWeight: "700",
  },
});
