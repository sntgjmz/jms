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

type FinanceTrip = {
  schedule: PublicScheduleConfig;
  departureAt: Date | null;
  verifiedRevenue: number;
  pendingVerification: number;
  cashCollection: number;
  totalBookings: number;
};

export default function OperatorFinanceScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [items, setItems] = useState<FinanceTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadFinance();
  }, [session]);

  async function loadFinance() {
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
      const cards = operatorSchedules
        .map((schedule) => {
          const personForSchedule = person.filter((item) => item.scheduleId === schedule.id);
          const cargoForSchedule = cargo.filter((item) => item.scheduleId === schedule.id);
          return {
            schedule,
            departureAt: toDateValue(schedule.departureDatetime ?? schedule.departure),
            verifiedRevenue: sumByPaymentStatus(personForSchedule, cargoForSchedule, "verified"),
            pendingVerification: sumByPaymentStatus(personForSchedule, cargoForSchedule, "for_verification"),
            cashCollection: sumByPaymentStatus(personForSchedule, cargoForSchedule, "for_cash_collection"),
            totalBookings: personForSchedule.length + cargoForSchedule.length,
          };
        })
        .sort((left, right) => (right.departureAt?.getTime() ?? 0) - (left.departureAt?.getTime() ?? 0));
      setItems(cards);
    } catch (err) {
      if (err instanceof ApiError) setError(`Finance data failed (${err.status}).`);
      else if (err instanceof Error) setError(err.message);
      else setError("Unable to load operator finance records.");
    } finally {
      setIsLoading(false);
    }
  }

  const totals = useMemo(() => ({
    verified: items.reduce((sum, item) => sum + item.verifiedRevenue, 0),
    pending: items.reduce((sum, item) => sum + item.pendingVerification, 0),
    cash: items.reduce((sum, item) => sum + item.cashCollection, 0),
  }), [items]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F4FAFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Finance</Text>
        <Pressable style={styles.iconButton} onPress={() => void loadFinance()}>
          <Ionicons name="refresh" size={22} color="#F4FAFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="small" color="#5CB8FF" />
            <Text style={styles.helper}>Loading finance summary...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Finance unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Payout Reconciliation</Text>
              <Text style={styles.title}>Operator Finance Snapshot</Text>
              <Text style={styles.subtitle}>Use this to monitor verified income, pending receipts, and cash collections under your assigned trips.</Text>
            </View>

            <View style={styles.grid}>
              <FinanceCard label="Verified Revenue" value={formatCurrency(totals.verified)} hint="Cleared and approved payments" />
              <FinanceCard label="Pending Verification" value={formatCurrency(totals.pending)} hint="GCash receipts under review" />
              <FinanceCard label="Cash Collection" value={formatCurrency(totals.cash)} hint="Cash payments to collect on-site" />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Trip Reconciliation</Text>
              <Text style={styles.sectionHint}>Each trip shows what is already cleared versus what still needs review or collection.</Text>
              <View style={styles.list}>
                {items.length === 0 ? (
                  <Text style={styles.helper}>No operator finance records yet.</Text>
                ) : (
                  items.map((item) => (
                    <View key={item.schedule.id} style={styles.tripCard}>
                      <View style={styles.tripHeader}>
                        <View style={styles.tripCopy}>
                          <Text style={styles.tripTitle}>{item.schedule.boatName || item.schedule.route}</Text>
                          <Text style={styles.tripRoute}>{item.schedule.origin || "From"} {"->"} {item.schedule.destination || "Destination"}</Text>
                        </View>
                        <Text style={styles.tripDate}>{formatScheduleDate(item.departureAt)}</Text>
                      </View>
                      <View style={styles.metaGrid}>
                        <MiniStat label="Verified" value={formatCurrency(item.verifiedRevenue)} />
                        <MiniStat label="Pending" value={formatCurrency(item.pendingVerification)} />
                        <MiniStat label="Cash" value={formatCurrency(item.cashCollection)} />
                        <MiniStat label="Bookings" value={`${item.totalBookings}`} />
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FinanceCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function toDateValue(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(value || 0);
}

function formatScheduleDate(value: Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

function sumByPaymentStatus(
  personItems: PersonBookingRecord[],
  cargoItems: CargoBookingRecord[],
  paymentStatus: string,
) {
  return [...personItems, ...cargoItems].reduce(
    (sum, item) => item.paymentStatus === paymentStatus ? sum + (item.totalAmount || 0) : sum,
    0,
  );
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
  sectionCard: { borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 10 },
  sectionTitle: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  sectionHint: { color: "#90AFCB", fontSize: 12, lineHeight: 17 },
  list: { gap: 12 },
  tripCard: { borderRadius: 18, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 14, gap: 10 },
  tripHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  tripCopy: { flex: 1, gap: 3 },
  tripTitle: { color: "#F7FBFF", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  tripRoute: { color: "#B4CAE0", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  tripDate: { color: "#8FAFCC", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  metaGrid: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  miniStat: { width: "48%", borderRadius: 14, borderWidth: 1, borderColor: "#244767", backgroundColor: "#102841", padding: 10, gap: 2 },
  miniLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  miniValue: { color: "#F6FBFF", fontSize: 14, lineHeight: 18, fontWeight: "800" },
});
