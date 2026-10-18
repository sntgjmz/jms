import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { type Href, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

const DRAWER_WIDTH = 308;
const ACTIVE_BOOKING_STATUSES = new Set([
  "pending",
  "pending_payment",
  "for_verification",
  "for_cash_collection",
  "confirmed",
]);
const FINISHED_TRIP_STATUSES = new Set(["completed", "arrived", "delivered", "cancelled"]);
const COMPLETED_TODAY_STATUSES = new Set(["completed", "arrived", "delivered"]);
const LIVE_OPERATOR_TRIP_STATUSES = new Set([
  "boarding",
  "final_call",
  "departure",
  "departed",
  "in_transit",
  "out_for_delivery",
  "delayed",
]);

type DrawerAction =
  | "dashboard"
  | "pending"
  | "trip-execution"
  | "payment-verification"
  | "notifications"
  | "activity-log"
  | "finance"
  | "analytics"
  | "settings"
  | "logout";

type OperatorTripCard = {
  schedule: PublicScheduleConfig;
  departureAt: Date | null;
  arrivalAt: Date | null;
  personCount: number;
  cargoCount: number;
  pendingPassengerBookings: number;
  pendingCargoBookings: number;
  verifiedRevenue: number;
};

const DRAWER_ITEMS: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: DrawerAction;
}> = [
  { label: "Dashboard", icon: "grid-outline", action: "dashboard" },
  { label: "Pending Trips & Schedules", icon: "calendar-outline", action: "pending" },
  { label: "Trip Execution", icon: "navigate-outline", action: "trip-execution" },
  { label: "Payment Verification", icon: "card-outline", action: "payment-verification" },
  { label: "Notifications", icon: "notifications-outline", action: "notifications" },
  { label: "Activity Log", icon: "receipt-outline", action: "activity-log" },
  { label: "Finance", icon: "wallet-outline", action: "finance" },
  { label: "Analytics", icon: "stats-chart-outline", action: "analytics" },
  { label: "Settings", icon: "settings-outline", action: "settings" },
  { label: "Logout", icon: "log-out-outline", action: "logout" },
];

export default function OperatorHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, setSession } = useAuth();
  const [schedules, setSchedules] = useState<PublicScheduleConfig[]>([]);
  const [personBookings, setPersonBookings] = useState<PersonBookingRecord[]>([]);
  const [cargoBookings, setCargoBookings] = useState<CargoBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeDrawerAction, setActiveDrawerAction] = useState<DrawerAction>("dashboard");

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const drawerTranslateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const pendingSectionRef = useRef<View | null>(null);

  const operatorKey = session ? String(session.principalId) : "";
  const operatorName = session?.username?.trim().toLowerCase() ?? "";

  useEffect(() => {
    void loadDashboard();
  }, [session]);

  async function loadDashboard(showRefresh = false) {
    if (!session || session.principalType !== "BOAT_OPERATOR") {
      setIsLoading(false);
      return;
    }

    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

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
      if (err instanceof ApiError) {
        setError(`Dashboard request failed (${err.status}).`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load operator dashboard.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  const operatorSchedules = useMemo(() => {
    return schedules
      .filter((schedule) => {
        const scheduleOperatorId = schedule.operatorId?.trim();
        const scheduleOperatorName = schedule.operatorName?.trim().toLowerCase();
        return (scheduleOperatorId && scheduleOperatorId === operatorKey)
          || (scheduleOperatorName && scheduleOperatorName === operatorName);
      })
      .sort((left, right) => {
        const leftTime = toDateValue(left.departureDatetime ?? left.departure)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = toDateValue(right.departureDatetime ?? right.departure)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
  }, [operatorKey, operatorName, schedules]);

  const scheduleCards = useMemo<OperatorTripCard[]>(() => {
    return operatorSchedules.map((schedule) => {
      const personForSchedule = personBookings.filter((item) => item.scheduleId === schedule.id);
      const cargoForSchedule = cargoBookings.filter((item) => item.scheduleId === schedule.id);
      return {
        schedule,
        departureAt: toDateValue(schedule.departureDatetime ?? schedule.departure),
        arrivalAt: toDateValue(schedule.arrivalDatetime ?? schedule.arrival),
        personCount: personForSchedule.length,
        cargoCount: cargoForSchedule.length,
        pendingPassengerBookings: personForSchedule.filter((item) => ACTIVE_BOOKING_STATUSES.has(item.status)).length,
        pendingCargoBookings: cargoForSchedule.filter((item) => ACTIVE_BOOKING_STATUSES.has(item.status)).length,
        verifiedRevenue: sumRevenue(personForSchedule) + sumRevenue(cargoForSchedule),
      };
    });
  }, [cargoBookings, operatorSchedules, personBookings]);

  const now = new Date();
  const todayCards = useMemo(() => scheduleCards.filter((card) => isSameDay(card.departureAt, now)), [scheduleCards, now]);
  const completedTripsToday = todayCards.filter((card) =>
    COMPLETED_TODAY_STATUSES.has(normalizeStatus(card.schedule.tripStatus)),
  ).length;
  const earningsToday = todayCards.reduce((sum, card) => sum + card.verifiedRevenue, 0);

  const nextImmediateTrip = useMemo(() => {
    return scheduleCards.find((card) => {
      const status = normalizeStatus(card.schedule.tripStatus);
      if (FINISHED_TRIP_STATUSES.has(status)) return false;
      if (!card.departureAt) return false;
      return card.departureAt.getTime() >= now.getTime();
    }) ?? null;
  }, [now, scheduleCards]);

  const pendingTrips = useMemo(() => {
    return scheduleCards.filter((card) => {
      const status = normalizeStatus(card.schedule.tripStatus);
      if (FINISHED_TRIP_STATUSES.has(status)) return false;
      if (LIVE_OPERATOR_TRIP_STATUSES.has(status)) return true;
      if (!card.departureAt) return false;
      return card.departureAt.getTime() >= now.getTime();
    });
  }, [now, scheduleCards]);

  const totalPendingQueue = pendingTrips.reduce(
    (sum, card) => sum + card.pendingPassengerBookings + card.pendingCargoBookings,
    0,
  );

  function openDrawer() {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 190, useNativeDriver: true }),
      Animated.timing(drawerTranslateX, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(drawerTranslateX, { toValue: DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  }

  async function signOut() {
    await setSession(null);
    router.replace("/login");
  }

  function onDrawerAction(action: DrawerAction) {
    setActiveDrawerAction(action);
    if (action === "dashboard") {
      closeDrawer();
      return;
    }
    if (action === "pending") {
      closeDrawer();
      router.push("/operator/pending");
      return;
    }
    if (action === "trip-execution") {
      closeDrawer();
      if (nextImmediateTrip) {
        router.push({ pathname: "/operator/trip-execution", params: { scheduleId: nextImmediateTrip.schedule.id } });
      }
      return;
    }
    if (action === "payment-verification") {
      closeDrawer();
      router.push("/operator/payment-verification" as Href);
      return;
    }
    if (action === "activity-log") {
      closeDrawer();
      router.push("/operator/activity-log");
      return;
    }
    if (action === "finance") {
      closeDrawer();
      router.push("/operator/finance" as Href);
      return;
    }
    if (action === "analytics") {
      closeDrawer();
      router.push("/operator/analytics" as Href);
      return;
    }
    if (action === "notifications") {
      closeDrawer();
      router.push("/operator/notifications" as Href);
      return;
    }
    if (action === "settings") {
      closeDrawer();
      router.push("/operator/settings");
      return;
    }
    if (action === "logout") {
      closeDrawer();
      void signOut();
    }
  }

  function toggleCard(scheduleId: string) {
    setExpandedScheduleId((current) => (current === scheduleId ? null : scheduleId));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
        <View style={styles.brandRow}>
          <Image source={require("../../assets/images/isla-sakay-icon.png")} style={styles.brandLogo} contentFit="contain" />
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>Operator Dashboard</Text>
            <Text style={styles.brandSubtitle}>{session?.username ?? "Assigned operator"} | Isla Sakay</Text>
          </View>
        </View>
        <Pressable style={styles.menuButton} onPress={openDrawer}>
          <Ionicons name="menu" size={28} color="#113A62" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>Today&apos;s Summary</Text>
              <Text style={styles.subtitle}>Metrics below are scoped only to schedules assigned to this operator.</Text>
            </View>
            <Pressable style={styles.refreshButton} onPress={() => void loadDashboard(true)}>
              <Text style={styles.refreshButtonText}>{isRefreshing ? "Refreshing..." : "Refresh"}</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#5CB8FF" />
              <Text style={styles.helperText}>Loading your dashboard...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Today&apos;s Earnings</Text>
                  <Text style={styles.metricValue}>{formatCurrency(earningsToday)}</Text>
                  <Text style={styles.metricHint}>Verified bookings under your trips today</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Completed Today</Text>
                  <Text style={styles.metricValue}>{completedTripsToday}</Text>
                  <Text style={styles.metricHint}>Trips finished on your assigned schedule list</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Pending Queue</Text>
                  <Text style={styles.metricValue}>{totalPendingQueue}</Text>
                  <Text style={styles.metricHint}>Passenger + cargo items waiting under you</Text>
                </View>
              </View>

              <View style={styles.nextCard}>
                <Text style={styles.sectionEyebrow}>Next Immediate Schedule</Text>
                {nextImmediateTrip ? (
                  <>
                    <Text style={styles.nextTitle}>{nextImmediateTrip.schedule.boatName || nextImmediateTrip.schedule.route}</Text>
                    <Text style={styles.nextRoute}>
                      {nextImmediateTrip.schedule.origin || "From"} {"->"} {nextImmediateTrip.schedule.destination || "Destination"}
                    </Text>
                    <View style={styles.nextMetaRow}>
                      <Text style={styles.nextMeta}>{formatScheduleDate(nextImmediateTrip.departureAt)}</Text>
                      <Text style={styles.nextMeta}>{formatTimeRange(nextImmediateTrip.departureAt, nextImmediateTrip.arrivalAt)}</Text>
                    </View>
                    <Text style={styles.nextStatus}>
                      {statusLabel(nextImmediateTrip.schedule.tripStatus)} | {nextImmediateTrip.pendingPassengerBookings} passenger / {nextImmediateTrip.pendingCargoBookings} cargo pending
                    </Text>
                    <Pressable
                      style={styles.primaryAction}
                      onPress={() => router.push({ pathname: "/operator/trip-execution", params: { scheduleId: nextImmediateTrip.schedule.id } })}
                    >
                      <Text style={styles.primaryActionText}>Open Trip Execution</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.helperText}>No upcoming operator schedule found right now.</Text>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.listCard} ref={pendingSectionRef}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Pending Trips & Schedules</Text>
              <Text style={styles.sectionCaption}>Upcoming schedules and queue snapshots for this operator only.</Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterPillText}>{pendingTrips.length}</Text>
            </View>
          </View>

          {isLoading ? null : error ? null : pendingTrips.length === 0 ? (
            <Text style={styles.emptyText}>No pending or upcoming schedules found for this operator.</Text>
          ) : (
            <View style={styles.tripList}>
              {pendingTrips.map((card) => {
                const expanded = expandedScheduleId === card.schedule.id;
                return (
                  <Pressable key={card.schedule.id} style={styles.tripCard} onPress={() => toggleCard(card.schedule.id)}>
                    <View style={styles.tripHeader}>
                      <View style={styles.tripTitleWrap}>
                        <Text style={styles.tripTitle} numberOfLines={1}>{card.schedule.boatName || card.schedule.route}</Text>
                        <Text style={styles.tripRoute} numberOfLines={1}>
                          {card.schedule.origin || "From"} {"->"} {card.schedule.destination || "Destination"}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, statusPillStyle(normalizeStatus(card.schedule.tripStatus))]}>
                        <Text style={styles.statusPillText}>{statusLabel(card.schedule.tripStatus)}</Text>
                      </View>
                    </View>

                    <View style={styles.tripMetaGrid}>
                      <View style={styles.tripMetaCard}>
                        <Text style={styles.tripMetaLabel}>Schedule</Text>
                        <Text style={styles.tripMetaValue}>{formatScheduleDate(card.departureAt)}</Text>
                        <Text style={styles.tripMetaHint}>{formatTimeRange(card.departureAt, card.arrivalAt)}</Text>
                      </View>
                      <View style={styles.tripMetaCard}>
                        <Text style={styles.tripMetaLabel}>Queue</Text>
                        <Text style={styles.tripMetaValue}>{card.pendingPassengerBookings + card.pendingCargoBookings}</Text>
                        <Text style={styles.tripMetaHint}>{card.pendingPassengerBookings} passenger | {card.pendingCargoBookings} cargo</Text>
                      </View>
                      <View style={styles.tripMetaCard}>
                        <Text style={styles.tripMetaLabel}>Capacity</Text>
                        <Text style={styles.tripMetaValue}>{formatSlots(card.schedule.availableSeats, card.schedule.capacity)}</Text>
                        <Text style={styles.tripMetaHint}>Seats remaining / total</Text>
                      </View>
                      <View style={styles.tripMetaCard}>
                        <Text style={styles.tripMetaLabel}>Revenue</Text>
                        <Text style={styles.tripMetaValue}>{formatCurrency(card.verifiedRevenue)}</Text>
                        <Text style={styles.tripMetaHint}>Verified payments under this trip</Text>
                      </View>
                    </View>

                    {expanded ? (
                      <View style={styles.expandedBlock}>
                        <Text style={styles.expandedLine}>Operator: {card.schedule.operatorName || session?.username || "Assigned operator"}</Text>
                        <Text style={styles.expandedLine}>Passengers booked: {card.personCount}</Text>
                        <Text style={styles.expandedLine}>Cargo bookings: {card.cargoCount}</Text>
                        <Text style={styles.expandedLine}>Notes: {card.schedule.notes?.trim() || "No extra notes for this schedule."}</Text>
                        <Pressable
                          style={styles.secondaryAction}
                          onPress={() => router.push({ pathname: "/operator/trip-execution", params: { scheduleId: card.schedule.id } })}
                        >
                          <Text style={styles.secondaryActionText}>View Details</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.tapHint}>Tap to view schedule details</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {drawerVisible ? (
        <View style={styles.drawerRoot} pointerEvents="box-none">
          <Animated.View style={[styles.drawerOverlay, { opacity: overlayOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { paddingTop: Math.max(insets.top, 12) + 10, transform: [{ translateX: drawerTranslateX }] }]}>
            <View style={styles.drawerTop}>
              <Pressable onPress={closeDrawer} style={styles.drawerBackBtn}>
                <Ionicons name="arrow-back" size={24} color="#F4FAFF" />
              </Pressable>
              <View style={styles.drawerProfile}>
                <View style={styles.drawerAvatar}>
                  <MaterialCommunityIcons name="ferry" size={34} color="#103A61" />
                </View>
                <View style={styles.drawerProfileText}>
                  <Text style={styles.drawerName}>{session?.username ?? "Boat Operator"}</Text>
                  <Text style={styles.drawerSub}>Operator modules</Text>
                </View>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.drawerList}>
              {DRAWER_ITEMS.map((item) => (
                <Pressable
                  key={item.action}
                  onPress={() => onDrawerAction(item.action)}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    activeDrawerAction === item.action && styles.drawerItemActive,
                    pressed && styles.drawerItemPressed,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={activeDrawerAction === item.action ? "#EAF5FF" : "#16385A"}
                  />
                  <Text style={[styles.drawerItemText, activeDrawerAction === item.action && styles.drawerItemTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function toDateValue(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(left: Date | null, right: Date) {
  if (!left) return false;
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function normalizeStatus(status?: string | null) {
  return status?.trim().toLowerCase() || "preparing";
}

function statusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);
  switch (normalized) {
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
    case "maintenance": return "Maintenance";
    default: return "Preparing";
  }
}

function statusPillStyle(status: string) {
  if (status === "delayed") return { backgroundColor: "#4B3410", borderColor: "#9B6A20" };
  if (status === "boarding" || status === "final_call") return { backgroundColor: "#123859", borderColor: "#2F74E8" };
  if (status === "in_transit" || status === "out_for_delivery" || status === "departure" || status === "departed") return { backgroundColor: "#103D38", borderColor: "#29C29A" };
  if (status === "completed" || status === "arrived" || status === "delivered") return { backgroundColor: "#143321", borderColor: "#44C276" };
  if (status === "cancelled" || status === "maintenance") return { backgroundColor: "#3A1D26", borderColor: "#C94F6D" };
  return { backgroundColor: "#15324D", borderColor: "#315D88" };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatScheduleDate(value: Date | null) {
  if (!value) return "Schedule time unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatTimeRange(start: Date | null, end: Date | null) {
  if (!start && !end) return "Time not set";
  const formatter = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start ? formatter.format(start) : "--"} - ${end ? formatter.format(end) : "--"}`;
}

function formatSlots(available?: number | null, capacity?: number | null) {
  return `${available ?? 0} / ${capacity ?? 0}`;
}

function sumRevenue(items: Array<PersonBookingRecord | CargoBookingRecord>) {
  return items.reduce((sum, item) => item.paymentStatus === "verified" ? sum + (item.totalAmount || 0) : sum, 0);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071A2C" },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: "#0C2238",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 12 },
  brandLogo: { width: 48, height: 48, borderRadius: 14 },
  brandCopy: { flex: 1 },
  brandTitle: { color: "#F8FBFF", fontSize: 22, lineHeight: 26, fontWeight: "800" },
  brandSubtitle: { color: "#8AA9C6", fontSize: 12, lineHeight: 16, marginTop: 2 },
  menuButton: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: "#F5FAFF",
    alignItems: "center", justifyContent: "center",
  },
  content: { padding: 18, gap: 16, paddingBottom: 28 },
  heroCard: { borderRadius: 26, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 16 },
  heroHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroCopy: { flex: 1, gap: 6 },
  title: { color: "#F6FBFF", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  subtitle: { color: "#8FAFCC", fontSize: 13, lineHeight: 18, fontWeight: "500" },
  refreshButton: { minHeight: 38, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "#315D88", backgroundColor: "#13304B", alignItems: "center", justifyContent: "center" },
  refreshButtonText: { color: "#D8E9F8", fontSize: 12, lineHeight: 14, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  helperText: { color: "#7EA2C3", fontSize: 13, lineHeight: 18 },
  errorText: { color: "#FF8B9E", fontSize: 13, lineHeight: 18 },
  metricGrid: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  metricCard: { width: "48%", borderRadius: 18, borderWidth: 1, borderColor: "#15324D", backgroundColor: "#102841", padding: 14, gap: 4 },
  metricLabel: { color: "#7EA2C3", fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  metricValue: { color: "#F6FBFF", fontSize: 22, lineHeight: 26, fontWeight: "800" },
  metricHint: { color: "#6D8BA8", fontSize: 12, lineHeight: 16 },
  nextCard: { borderRadius: 20, borderWidth: 1, borderColor: "#1E4A72", backgroundColor: "#0E2741", padding: 16, gap: 8 },
  sectionEyebrow: { color: "#76BDFC", fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  nextTitle: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  nextRoute: { color: "#C5D9EC", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  nextMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  nextMeta: { color: "#8BA8C4", fontSize: 12, lineHeight: 16 },
  nextStatus: { color: "#7CD4B6", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  primaryAction: { marginTop: 6, minHeight: 42, borderRadius: 14, backgroundColor: "#2F74E8", alignItems: "center", justifyContent: "center" },
  primaryActionText: { color: "#F8FBFF", fontSize: 13, lineHeight: 16, fontWeight: "800" },
  listCard: { borderRadius: 26, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 14 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  sectionTitle: { color: "#F6FBFF", fontSize: 20, lineHeight: 24, fontWeight: "800" },
  sectionCaption: { color: "#7EA2C3", fontSize: 12, lineHeight: 16, marginTop: 4 },
  counterPill: { minWidth: 34, minHeight: 34, paddingHorizontal: 10, borderRadius: 17, backgroundColor: "#1D4B76", alignItems: "center", justifyContent: "center" },
  counterPillText: { color: "#F8FBFF", fontSize: 12, lineHeight: 14, fontWeight: "800" },
  emptyText: { color: "#95B2CD", fontSize: 13, lineHeight: 18 },
  tripList: { gap: 12 },
  tripCard: { borderRadius: 22, borderWidth: 1, borderColor: "#1C4468", backgroundColor: "#102841", padding: 16, gap: 14 },
  tripHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  tripTitleWrap: { flex: 1, gap: 4 },
  tripTitle: { color: "#F7FBFF", fontSize: 17, lineHeight: 21, fontWeight: "800" },
  tripRoute: { color: "#A7C0D8", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  statusPillText: { color: "#F7FBFF", fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  tripMetaGrid: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  tripMetaCard: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 12, gap: 4 },
  tripMetaLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  tripMetaValue: { color: "#F6FBFF", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  tripMetaHint: { color: "#7B99B6", fontSize: 11, lineHeight: 15 },
  expandedBlock: { borderTopWidth: 1, borderTopColor: "#1D4468", paddingTop: 12, gap: 6 },
  expandedLine: { color: "#C5D9EC", fontSize: 12, lineHeight: 17 },
  secondaryAction: { marginTop: 6, minHeight: 40, borderRadius: 14, borderWidth: 1, borderColor: "#315D88", backgroundColor: "#15324D", alignItems: "center", justifyContent: "center" },
  secondaryActionText: { color: "#E8F3FF", fontSize: 12, lineHeight: 14, fontWeight: "800" },
  tapHint: { color: "#6FB9FF", fontSize: 11, lineHeight: 15, fontWeight: "700" },
  drawerRoot: { ...StyleSheet.absoluteFillObject, zIndex: 40, elevation: 20 },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,9,18,0.56)" },
  drawer: {
    position: "absolute", top: 0, right: 0, bottom: 0, width: DRAWER_WIDTH,
    backgroundColor: "#EAF2FB", borderTopLeftRadius: 28, borderBottomLeftRadius: 28, overflow: "hidden",
  },
  drawerTop: { backgroundColor: "#0E3454", paddingHorizontal: 18, paddingBottom: 18, gap: 14 },
  drawerBackBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  drawerProfile: { flexDirection: "row", alignItems: "center", gap: 14 },
  drawerAvatar: {
    width: 78, height: 78, borderRadius: 39, backgroundColor: "#F4FAFF",
    alignItems: "center", justifyContent: "center",
  },
  drawerProfileText: { flex: 1 },
  drawerName: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  drawerSub: { color: "#B4CEE6", fontSize: 12, lineHeight: 16, marginTop: 4 },
  drawerList: { padding: 16, gap: 12 },
  drawerItem: {
    minHeight: 62, borderRadius: 18, paddingHorizontal: 16, backgroundColor: "#F8FBFF",
    borderWidth: 1, borderColor: "#D9E6F4", flexDirection: "row", alignItems: "center", gap: 14,
  },
  drawerItemPressed: { opacity: 0.92 },
  drawerItemActive: { backgroundColor: "#1E4A72", borderColor: "#1E4A72" },
  drawerItemText: { color: "#16385A", fontSize: 15, lineHeight: 18, fontWeight: "700" },
  drawerItemTextActive: { color: "#EAF5FF" },
});
