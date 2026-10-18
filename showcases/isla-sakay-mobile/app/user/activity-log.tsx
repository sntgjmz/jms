import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
type ActivityItem = {
  id: string;
  kind: "boat" | "cargo";
  title: string;
  route: string;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
  tripDateTime: Date | null;
  amount: number;
  paxLabel: string;
  scheduleLabel?: string;
  operatorName?: string | null;
  scheduleStatus?: string | null;
  scheduleStatusReason?: string | null;
  scheduleStatusEta?: string | null;
  departureDatetime?: string | null;
  arrivalDatetime?: string | null;
};

function isPastOrClosedActivity(item: ActivityItem, nowMs: number = Date.now()) {
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

function formatClock(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":");
}

function resolveStatusCardMeta(item: ActivityItem, nowMs: number = Date.now()) {
  const status = (item.scheduleStatus ?? "").trim().toLowerCase();
  const reason = item.scheduleStatusReason?.trim() || null;
  const eta = item.scheduleStatusEta?.trim() || null;
  const departureMs = item.departureDatetime ? new Date(item.departureDatetime).getTime() : Number.NaN;
  const arrivalMs = item.arrivalDatetime ? new Date(item.arrivalDatetime).getTime() : Number.NaN;

  if (status === "completed") {
    return { label: "Completed", detail: "Trip already finished.", countdown: null as string | null, tone: "closed" as const };
  }
  if (status === "arrived") {
    return { label: "Arrived", detail: "Vessel already reached the destination.", countdown: null as string | null, tone: "closed" as const };
  }
  if (status === "cancelled") {
    return {
      label: "Cancelled",
      detail: reason ? `This trip will not operate. Reason: ${reason}` : "This trip will not operate.",
      countdown: null as string | null,
      tone: "danger" as const,
    };
  }
  if (status === "maintenance") {
    return {
      label: "Unavailable",
      detail: reason ? `Unavailable due to maintenance. Reason: ${reason}` : "Vessel is unavailable due to maintenance.",
      countdown: null as string | null,
      tone: "danger" as const,
    };
  }
  if (status === "delayed") {
    return {
      label: "Delayed",
      detail: [eta ? `Estimated departure: ${formatClock(eta) ?? eta}.` : null, reason ? `Reason: ${reason}` : "Trip departure has been delayed."]
        .filter(Boolean)
        .join(" "),
      countdown: null as string | null,
      tone: "soon" as const,
    };
  }
  if (status === "in_transit") {
    return { label: "In transit", detail: "Vessel is currently on the way.", countdown: null as string | null, tone: "departed" as const };
  }
  if (status === "departure" || status === "departed") {
    return { label: "Departed", detail: "Vessel already departed from the port.", countdown: null as string | null, tone: "departed" as const };
  }
  if (status === "final_call") {
    return { label: "Final call", detail: "Last 5 minutes before departure.", countdown: null as string | null, tone: "soon" as const };
  }
  if (status === "boarding") {
    return { label: "Boarding", detail: "Boarding window is open up to 30 minutes before departure.", countdown: null as string | null, tone: "boarding" as const };
  }

  if (Number.isNaN(departureMs)) {
    return { label: "Scheduled", detail: "Waiting for the scheduled departure window.", countdown: null as string | null, tone: "scheduled" as const };
  }

  const diffSeconds = Math.floor((departureMs - nowMs) / 1000);
  if (!Number.isNaN(arrivalMs) && nowMs >= arrivalMs) {
    return { label: "Completed", detail: "Trip already finished.", countdown: null as string | null, tone: "closed" as const };
  }
  if (diffSeconds > 1800) {
    return { label: "Scheduled", detail: "Boarding starts 30 minutes before departure.", countdown: formatCountdown(diffSeconds), tone: "scheduled" as const };
  }
  if (diffSeconds > 300) {
    return { label: "Boarding", detail: "Passengers should proceed to the boat now.", countdown: formatCountdown(diffSeconds), tone: "boarding" as const };
  }
  if (diffSeconds > 0) {
    return { label: "Final call", detail: "Less than 5 minutes before departure.", countdown: formatCountdown(diffSeconds), tone: "soon" as const };
  }
  if (diffSeconds >= -1800) {
    return { label: "Departed", detail: "Vessel already left the port.", countdown: null as string | null, tone: "departed" as const };
  }
  return { label: "Completed", detail: "Trip already finished.", countdown: null as string | null, tone: "closed" as const };
}

function toScheduleStatusLabel(status?: string | null, reason?: string | null) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "in_transit") return "In transit";
  if (normalized === "departure" || normalized === "departed") return "Departed";
  if (normalized === "boarding") return "Boarding";
  if (normalized === "final_call") return "Final call";
  if (normalized === "arrived") return "Arrived";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled") return reason?.trim() ? `Cancelled | ${reason}` : "Cancelled";
  if (normalized === "delayed") return reason?.trim() ? `Delayed | ${reason}` : "Delayed";
  if (normalized === "preparing") return "Preparing";
  if (!normalized) return null;
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toActivityMessage(item: ActivityItem) {
  const scheduleLabel = toScheduleStatusLabel(item.scheduleStatus, item.scheduleStatusReason);
  const payment = item.paymentStatus.toLowerCase();
  const booking = item.bookingStatus.toLowerCase();

  if (scheduleLabel) return scheduleLabel;
  if (payment === "for_verification") return "Payment receipt under review";
  if (payment === "verified") return "Payment approved";
  if (payment === "rejected") return "Payment rejected";
  if (payment === "for_cash_collection") return "Collecting cash on-site";
  if (booking === "completed") return "Trip completed";
  if (booking === "cancelled") return "Booking cancelled";
  if (booking === "confirmed") return "Booking confirmed";
  return "Waiting for next update";
}

function toTone(item: ActivityItem) {
  const schedule = (item.scheduleStatus ?? "").toLowerCase();
  const payment = item.paymentStatus.toLowerCase();
  const booking = item.bookingStatus.toLowerCase();

  if (payment === "rejected" || booking === "cancelled" || schedule === "cancelled") return "danger";
  if (schedule === "in_transit" || schedule === "departure" || schedule === "departed") return "accent";
  if (schedule === "arrived" || schedule === "completed" || booking === "completed") return "success";
  if (payment === "verified" || booking === "confirmed" || schedule === "boarding" || schedule === "final_call") return "info";
  return "neutral";
}

function toneStyles(tone: ReturnType<typeof toTone>) {
  switch (tone) {
    case "danger":
      return {
        chipBg: "#4D2230",
        chipBorder: "#834355",
        chipText: "#FFD6E0",
      };
    case "accent":
      return {
        chipBg: "#153A63",
        chipBorder: "#2B6AA0",
        chipText: "#BDE1FF",
      };
    case "success":
      return {
        chipBg: "#183A31",
        chipBorder: "#2D7460",
        chipText: "#CCF7E8",
      };
    case "info":
      return {
        chipBg: "#15324C",
        chipBorder: "#3B6F99",
        chipText: "#D8EEFF",
      };
    default:
      return {
        chipBg: "#122B43",
        chipBorder: "#31526E",
        chipText: "#D7E9F9",
      };
  }
}

function buildActivityItems(
  person: PersonBookingRecord[],
  cargo: CargoBookingRecord[],
  schedules: PublicScheduleConfig[],
): ActivityItem[] {
  const scheduleMap = new Map<string, PublicScheduleConfig>();
  schedules.forEach((schedule) => {
    if (schedule.id) scheduleMap.set(schedule.id, schedule);
  });

  const personItems: ActivityItem[] = person.map((booking) => {
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
      paxLabel: `${booking.numberOfPassengers} passenger${booking.numberOfPassengers > 1 ? "s" : ""}`,
      scheduleLabel: booking.scheduleLabel,
      operatorName: schedule?.operatorName,
      scheduleStatus: schedule?.tripStatus,
      scheduleStatusReason: schedule?.tripStatusReason,
      scheduleStatusEta: schedule?.tripStatusEta,
      departureDatetime: schedule?.departureDatetime ?? null,
      arrivalDatetime: schedule?.arrivalDatetime ?? null,
    };
  });

  const cargoItems: ActivityItem[] = cargo.map((booking) => {
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
      paxLabel: `${booking.weight} kg cargo`,
      scheduleLabel: booking.scheduleLabel,
      operatorName: schedule?.operatorName,
      scheduleStatus: schedule?.tripStatus,
      scheduleStatusReason: schedule?.tripStatusReason,
      scheduleStatusEta: schedule?.tripStatusEta,
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

export default function ActivityLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  const loadActivity = useCallback(async (isRefresh = false) => {
    if (!session?.accessToken) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [person, cargo, schedules] = await Promise.all([
        getMyPersonBookings(session.accessToken),
        getMyCargoBookings(session.accessToken),
        getPublicSchedules(),
      ]);
      setItems(buildActivityItems(person, cargo, schedules));
    } catch (error) {
      setDialogKind("error");
      setDialogTitle("Unable to load activity");
      if (error instanceof ApiError) {
        setDialogMessage(`Could not fetch your booking activity (${error.status}).`);
      } else {
        setDialogMessage("Could not fetch your booking activity.");
      }
      setDialogVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!session?.accessToken) return;
      setLoading(true);
      try {
        const [person, cargo, schedules] = await Promise.all([
          getMyPersonBookings(session.accessToken),
          getMyCargoBookings(session.accessToken),
          getPublicSchedules(),
        ]);
        if (!active) return;
        setItems(buildActivityItems(person, cargo, schedules));
      } catch (error) {
        if (!active) return;
        setDialogKind("error");
        setDialogTitle("Unable to load activity");
        if (error instanceof ApiError) {
          setDialogMessage(`Could not fetch your booking activity (${error.status}).`);
        } else {
          setDialogMessage("Could not fetch your booking activity.");
        }
        setDialogVisible(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const interval = setInterval(() => {
      void loadActivity(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadActivity, session?.accessToken]);

  const activeItems = useMemo(
    () => items.filter((item) => !isPastOrClosedActivity(item)),
    [items],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top * 0.35) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF6FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Activity Log</Text>
        <Pressable style={styles.refreshBtn} onPress={() => void loadActivity(true)}>
          <Ionicons name="refresh" size={16} color="#DCEEFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
      <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Live trip tracking</Text>
          <Text style={styles.heroHint}>Auto-refreshing every 15 seconds</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{activeItems.length}</Text>
              <Text style={styles.heroStatLabel}>Active</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#9ED2FF" />
            <Text style={styles.loadingText}>Loading your booking activity...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trail-sign-outline" size={26} color="#9FD0F5" />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>Your boat and cargo bookings will appear here once you start booking trips.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Active tracking</Text>
            {activeItems.length === 0 ? (
              <Text style={styles.emptySectionText}>No active bookings right now.</Text>
            ) : (
              activeItems.map((item) => <ActivityCard key={item.id} item={item} />)
            )}
          </>
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

function ActivityCard({ item, compact = false }: { item: ActivityItem; compact?: boolean }) {
  const tone = toneStyles(toTone(item));
  const statusMeta = resolveStatusCardMeta(item);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <View style={[styles.kindBadge, item.kind === "cargo" && styles.kindBadgeCargo]}>
            <MaterialCommunityIcons
              name={item.kind === "cargo" ? "ferry" : "ferry"}
              size={14}
              color={item.kind === "cargo" ? "#FFE0BD" : "#CFEAFF"}
            />
            <Text style={styles.kindBadgeText}>{item.kind === "cargo" ? "Cargo" : "Boat"}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: tone.chipBg, borderColor: tone.chipBorder }]}>
          <Text style={[styles.statusChipText, { color: tone.chipText }]} numberOfLines={1}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <Text style={styles.routeText}>{item.route}</Text>

      {(statusMeta.countdown || statusMeta.detail) ? (
        <View style={styles.statusDetailCard}>
          {statusMeta.countdown ? <Text style={styles.statusCountdown}>{statusMeta.countdown}</Text> : null}
          <Text style={styles.statusDetailText}>{statusMeta.detail}</Text>
        </View>
      ) : null}

      <View style={styles.metaGrid}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Trip time</Text>
          <Text style={styles.metaValue}>{formatDateTime(item.tripDateTime)}</Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Booking</Text>
          <Text style={styles.metaValue}>{item.paxLabel}</Text>
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

      {item.operatorName ? (
        <View style={styles.operatorRow}>
          <Ionicons name="person-outline" size={14} color="#9FCBF0" />
          <Text style={styles.operatorText} numberOfLines={1}>
            Operator: {item.operatorName}
          </Text>
        </View>
      ) : null}
    </View>
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
  refreshBtn: {
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
    gap: 10,
  },
  heroTitle: { color: "#F2F8FF", fontSize: 18, fontWeight: "800" },
  heroHint: { color: "#A8C2D8", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  heroText: { color: "#B8D0E6", fontSize: 13, lineHeight: 19 },
  heroStats: { flexDirection: "row", gap: 10 },
  heroStat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#244968",
    backgroundColor: "#0A2238",
    padding: 12,
    gap: 2,
  },
  heroStatValue: { color: "#F2F8FF", fontSize: 19, fontWeight: "800" },
  heroStatLabel: { color: "#A8C2D8", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 16,
  },
  loadingText: { color: "#B8D0E6", fontSize: 13 },
  emptyCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 20,
    gap: 8,
  },
  emptyTitle: { color: "#EAF6FF", fontSize: 15, fontWeight: "800" },
  emptyText: { color: "#B8D0E6", fontSize: 12, lineHeight: 18, textAlign: "center" },
  sectionLabel: {
    marginTop: 4,
    color: "#A7C0D9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  emptySectionText: { color: "#9CB8D3", fontSize: 12, paddingBottom: 4 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#214A6B",
    backgroundColor: "#0B2741",
    padding: 14,
    gap: 10,
  },
  cardCompact: { opacity: 0.92 },
  cardHeader: { gap: 10 },
  cardTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "#143A5D",
    borderWidth: 1,
    borderColor: "#2C678F",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  kindBadgeCargo: {
    backgroundColor: "#46321E",
    borderColor: "#7B5732",
  },
  kindBadgeText: { color: "#EAF6FF", fontSize: 10, fontWeight: "800" },
  cardTitle: { flex: 1, color: "#F2F8FF", fontSize: 15, fontWeight: "800" },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: { fontSize: 11, fontWeight: "800" },
  routeText: { color: "#D1E4F6", fontSize: 13, fontWeight: "700" },
  statusDetailCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#204661",
    backgroundColor: "#0A2238",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  statusCountdown: { color: "#DDF4FF", fontSize: 16, fontWeight: "900" },
  statusDetailText: { color: "#B7D3E8", fontSize: 12, lineHeight: 18 },
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
  metaValue: { color: "#EAF6FF", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  operatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#0F2E49",
    borderWidth: 1,
    borderColor: "#214A6B",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  operatorText: { flex: 1, color: "#D5E7F8", fontSize: 12, fontWeight: "700" },
});
