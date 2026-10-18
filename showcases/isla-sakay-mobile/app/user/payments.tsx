import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  getMyCargoBookings,
  getMyPersonBookings,
  type CargoBookingRecord,
  type PersonBookingRecord,
} from "@/services/api";

type BookingRecord = PersonBookingRecord | CargoBookingRecord;
type DialogKind = "info" | "success" | "error";
type TabKey = "all" | "pending" | "verified";

function formatPeso(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `PHP ${value.toFixed(2)}`;
}

function statusLabel(record: BookingRecord) {
  if (record.paymentStatus === "verified") return "Verified";
  if (record.paymentStatus === "rejected") return "Rejected";
  if (record.paymentStatus === "for_cash_collection") return "Cash collection";
  if (record.paymentStatus === "for_verification") return "For verification";
  return "Pending";
}

function statusTone(record: BookingRecord) {
  if (record.paymentStatus === "verified") return styles.badgeSuccess;
  if (record.paymentStatus === "rejected") return styles.badgeError;
  if (record.paymentStatus === "for_cash_collection") return styles.badgeInfo;
  return styles.badgePending;
}

function toScheduleLabel(record: BookingRecord) {
  const date = record.date ? `${record.date}` : "";
  const time = "time" in record && record.time ? `${record.time}` : "";
  if (!date && !time) return "Schedule pending";
  return [date, time].filter(Boolean).join(" | ");
}

export default function PaymentListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<BookingRecord[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!session?.accessToken) return;
      try {
        const [person, cargo] = await Promise.all([
          getMyPersonBookings(session.accessToken),
          getMyCargoBookings(session.accessToken),
        ]);
        if (!active) return;
        const merged = [...person, ...cargo].sort((a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
        );
        setRecords(merged);
      } catch (err) {
        if (err instanceof ApiError) {
          setDialogTitle("Unable to load payments");
          setDialogMessage(`Server returned ${err.status}. Please try again.`);
        } else {
          setDialogTitle("Unable to load payments");
          setDialogMessage("Please check your connection and try again.");
        }
        setDialogKind("error");
        setDialogVisible(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  const filtered = useMemo(() => {
    if (tab === "pending") {
      return records.filter((record) => record.paymentStatus !== "verified");
    }
    if (tab === "verified") {
      return records.filter((record) => record.paymentStatus === "verified");
    }
    return records;
  }, [records, tab]);

  function openTicket(record: BookingRecord) {
    const type = "cargoDescription" in record ? "cargo" : "person";
    router.push(`/user/ticket?bookingId=${record.id}&type=${type}`);
  }

  function openPayment(record: BookingRecord) {
    const type = "cargoDescription" in record ? "cargo" : "person";
    router.push(`/user/payment-wait?bookingId=${record.id}&type=${type}`);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top * 0.35) }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF6FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsRow}>
        {(["all", "pending", "verified"] as TabKey[]).map((key) => (
          <Pressable
            key={key}
            style={[styles.tabChip, tab === key && styles.tabChipActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === "all" ? "All" : key === "pending" ? "Pending" : "Verified"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#9ED2FF" />
            <Text style={styles.loadingText}>Loading payments…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No payment records yet.</Text>
        ) : (
          filtered.map((record) => (
            <View key={record.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardRoute} numberOfLines={1}>
                  {record.origin} → {record.destination}
                </Text>
                <View style={[styles.badge, statusTone(record)]}>
                  <Text style={styles.badgeText}>{statusLabel(record)}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{toScheduleLabel(record)}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardAmount}>{formatPeso(record.totalAmount)}</Text>
                <Text style={styles.cardType}>
                  {"cargoDescription" in record ? "Cargo" : "Passenger"}
                </Text>
              </View>
              {record.paymentStatus === "rejected" && record.paymentNotes ? (
                <View style={styles.reasonRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#FFC5CF" />
                  <Text style={styles.reasonText} numberOfLines={3}>
                    {record.paymentNotes}
                  </Text>
                </View>
              ) : null}
              <View style={styles.cardActions}>
                {record.paymentStatus === "verified" ? (
                  <Pressable style={styles.primaryBtn} onPress={() => openTicket(record)}>
                    <Ionicons name="ticket-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>View Receipt</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.secondaryBtn} onPress={() => openPayment(record)}>
                    <Ionicons name="wallet-outline" size={16} color="#DCEEFF" />
                    <Text style={styles.secondaryBtnText}>Open Payment</Text>
                  </Pressable>
                )}
              </View>
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
  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#0D2E4A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#EAF6FF", fontSize: 17, fontWeight: "800" },
  headerSpacer: { width: 38 },
  tabsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#254B6C",
    backgroundColor: "#0B2741",
  },
  tabChipActive: {
    backgroundColor: "#3A86E8",
    borderColor: "#3A86E8",
  },
  tabText: { color: "#B7D2EB", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#FFFFFF" },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 8 },
  loadingText: { color: "#A8C5DF", fontSize: 12 },
  emptyText: { color: "#A8C5DF", fontSize: 12 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 14,
    gap: 8,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardRoute: { color: "#EAF6FF", fontSize: 14, fontWeight: "800", flex: 1 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "#0B2A45", fontSize: 10, fontWeight: "800" },
  badgeSuccess: { backgroundColor: "#9ED2FF" },
  badgePending: { backgroundColor: "#FBD38D" },
  badgeError: { backgroundColor: "#FCA5A5" },
  badgeInfo: { backgroundColor: "#B3E5FF" },
  cardMeta: { color: "#A8C5DF", fontSize: 12 },
  cardMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardAmount: { color: "#DCEEFF", fontSize: 13, fontWeight: "700" },
  cardType: { color: "#8FB0CC", fontSize: 11, fontWeight: "700" },
  reasonRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6B2E39",
    backgroundColor: "#381B24",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  reasonText: {
    flex: 1,
    color: "#FFE4E9",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  cardActions: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A86E8",
    borderRadius: 12,
    paddingVertical: 10,
    flex: 1,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  secondaryBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3F6D91",
    backgroundColor: "#123654",
    paddingVertical: 10,
    flex: 1,
  },
  secondaryBtnText: { color: "#DCEEFF", fontSize: 12, fontWeight: "700" },
});
