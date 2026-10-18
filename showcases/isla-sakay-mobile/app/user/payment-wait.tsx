import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  attachMyBookingPaymentProof,
  getMyCargoBookings,
  getMyNotifications,
  getMyPersonBookings,
  type CargoBookingRecord,
  type PersonBookingRecord,
  type SystemNotification,
} from "@/services/api";

type DialogKind = "info" | "success" | "error";
type BookingRecord = PersonBookingRecord | CargoBookingRecord;

function formatPeso(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `PHP ${value.toFixed(2)}`;
}

function toDateTimeLabel(date?: string | null, time?: string | null) {
  const combined = date && time ? `${date}T${time}` : date ? `${date}T00:00:00` : null;
  if (!combined) return "Date pending";
  const parsed = new Date(combined);
  if (Number.isNaN(parsed.getTime())) return date ?? "Date pending";
  return parsed.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(booking?: BookingRecord | null) {
  const payment = booking?.paymentStatus ?? "pending";
  if (payment === "verified") return "Payment verified";
  if (payment === "rejected") return "Payment rejected";
  if (payment === "for_cash_collection") return "Collecting cash on-site";
  if (payment === "for_verification") return "Under verification";
  return "Waiting for verification";
}

function statusHint(booking?: BookingRecord | null) {
  const payment = booking?.paymentStatus ?? "pending";
  if (payment === "verified") return "Your booking is now confirmed. We will notify you for boarding updates.";
  if (payment === "rejected") return "Your payment was rejected. Please upload a new receipt or contact support.";
  if (payment === "for_cash_collection") return "Pay the boat operator at the dock. Your booking will be confirmed after collection.";
  return "Your payment receipt is queued for review. We will notify you once it is approved.";
}

export default function PaymentWaitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId, type } = useLocalSearchParams<{ bookingId?: string; type?: string }>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const previousPaymentStatus = useRef<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isUserAlert = (note: SystemNotification) => {
    if (!note.userId) return false;
    const type = (note.type ?? "").toLowerCase();
    const isPaymentNote = type.includes("booking") || type.includes("payment") || type.includes("trip_status");
    if (!isPaymentNote) return false;
    if (!bookingId) return true;
    const haystack = `${note.title ?? ""} ${note.message ?? ""}`.toLowerCase();
    return haystack.includes(String(bookingId).toLowerCase());
  };

  const timeline = useMemo(() => {
    const payment = booking?.paymentStatus ?? "pending";
    return [
      { label: "Submitted", done: true },
      { label: "Under review", done: payment !== "pending" },
      { label: "Approved", done: payment === "verified" || payment === "for_cash_collection" },
      { label: "Confirmed", done: booking?.status === "confirmed" || payment === "verified" },
    ];
  }, [booking]);

  const isRejected = booking?.paymentStatus === "rejected";
  const isVerified = booking?.paymentStatus === "verified";

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchData = async () => {
      if (!session?.accessToken || !bookingId) return;
      try {
        const [personBookings, cargoBookings, inbox] = await Promise.all([
          getMyPersonBookings(session.accessToken),
          getMyCargoBookings(session.accessToken),
          getMyNotifications(session.accessToken),
        ]);
        if (!active) return;
        const bookings = [...personBookings, ...cargoBookings];
        const found = bookings.find((b) => b.id === bookingId) ?? null;
        setBooking(found);
        setNotifications(inbox.filter(isUserAlert).slice(0, 4));
        setError(null);

        const currentStatus = found?.paymentStatus ?? null;
        if (previousPaymentStatus.current && currentStatus && previousPaymentStatus.current !== currentStatus) {
          const title = "Payment update";
          const message = statusLabel(found);
          // Showcase updates appear in the existing dialog and inbox, without device notifications.
          setDialogKind("success");
          setDialogTitle(title);
          setDialogMessage(message);
          setDialogVisible(true);
        }
        previousPaymentStatus.current = currentStatus;
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) setError(`Unable to refresh booking (${err.status}).`);
        else setError("Unable to refresh booking.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchData();
    timer = setInterval(() => {
      void fetchData();
    }, 15000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [session?.accessToken, bookingId]);

  async function pickReceiptAndUpload() {
    if (!session?.accessToken || !bookingId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setDialogKind("error");
      setDialogTitle("Permission needed");
      setDialogMessage("Allow photo library access to upload your receipt.");
      setDialogVisible(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.6,
      base64: true,
      selectionLimit: 1,
      legacy: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setDialogKind("error");
      setDialogTitle("Image error");
      setDialogMessage("Could not read the image. Please try another file.");
      setDialogVisible(true);
      return;
    }
    const mime = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    setIsUploading(true);
    try {
      await attachMyBookingPaymentProof(session.accessToken, bookingId, dataUrl);
      setDialogKind("success");
      setDialogTitle("Receipt submitted");
      setDialogMessage("Your updated receipt is now queued for verification.");
      setDialogVisible(true);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) setError(`Upload failed (${err.status}).`);
      else setError("Upload failed.");
      setDialogKind("error");
      setDialogTitle("Upload failed");
      setDialogMessage("We couldn't submit your receipt. Please try again.");
      setDialogVisible(true);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top * 0.35) }]}>
        <Pressable style={styles.headerBack} onPress={() => router.replace("/user/home")}>
          <Ionicons name="arrow-back" size={20} color="#EAF6FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Approval</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={styles.statusBadge}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#EAF6FF" />
            <Text style={styles.statusBadgeText}>{statusLabel(booking)}</Text>
          </View>
          <Text style={styles.statusHint}>{statusHint(booking)}</Text>
          <View style={styles.statusMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Booking ID</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{bookingId ?? "-"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Route</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {booking?.origin ?? "-"} → {booking?.destination ?? "-"}
              </Text>
            </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Schedule</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {toDateTimeLabel(booking?.date, booking && "time" in booking ? booking.time : null)}
                </Text>
              </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Total</Text>
              <Text style={styles.metaValue}>{formatPeso(booking?.totalAmount)}</Text>
            </View>
          </View>
          {booking?.paymentStatus === "rejected" && booking?.paymentNotes ? (
            <View style={styles.reasonCard}>
              <Text style={styles.reasonLabel}>Rejection reason</Text>
              <Text style={styles.reasonText}>{booking.paymentNotes}</Text>
            </View>
          ) : null}
        </View>

        {isRejected ? (
          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>Update your receipt</Text>
            <Text style={styles.actionHint}>
              Your payment was rejected. Upload a clearer screenshot or updated proof.
            </Text>
            <Pressable style={styles.secondaryBtn} onPress={() => void pickReceiptAndUpload()} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator size="small" color="#EAF6FF" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={18} color="#EAF6FF" />
                  <Text style={styles.secondaryBtnText}>Upload new screenshot</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Processing timeline</Text>
          {timeline.map((item, index) => (
            <View key={item.label} style={styles.timelineRow}>
              <View style={[styles.timelineDot, item.done && styles.timelineDotActive]}>
                {item.done && <Ionicons name="checkmark" size={12} color="#0B2A45" />}
              </View>
              <Text style={[styles.timelineText, item.done && styles.timelineTextActive]}>{item.label}</Text>
              {index < timeline.length - 1 && <View style={styles.timelineLine} />}
            </View>
          ))}
        </View>

        <View style={styles.inboxCard}>
          <View style={styles.inboxHeader}>
            <Text style={styles.sectionTitle}>Latest alerts</Text>
            <View style={styles.inboxActions}>
              <Pressable style={styles.refreshBtn} onPress={() => setLoading(true)}>
                <Ionicons name="refresh" size={16} color="#DCEEFF" />
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
              <Pressable style={styles.refreshBtn} onPress={() => router.push("/user/notifications")}>
                <Ionicons name="notifications-outline" size={16} color="#DCEEFF" />
                <Text style={styles.refreshText}>Open inbox</Text>
              </Pressable>
            </View>
          </View>
          {bookingId ? (
            <Text style={styles.inboxSubtitle}>Showing alerts for booking {bookingId}</Text>
          ) : null}
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#9ED2FF" />
              <Text style={styles.loadingText}>Checking updates…</Text>
            </View>
          ) : notifications.length === 0 ? (
            <Text style={styles.emptyText}>No alerts yet. We will notify you as soon as payment is verified.</Text>
          ) : (
            notifications.map((note) => (
              <View key={note.id} style={styles.noteRow}>
                <Ionicons name="notifications" size={18} color="#9ED2FF" />
                <View style={styles.noteTextWrap}>
                  <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                  <Text style={styles.noteMessage} numberOfLines={2}>{note.message}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.actions, { paddingBottom: Math.max(10, insets.bottom + 8) }]}>
          {isVerified && bookingId ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                const resolvedType = type === "cargo" || ("cargoDescription" in (booking ?? {})) ? "cargo" : "person";
                router.push(`/user/ticket?bookingId=${bookingId}&type=${resolvedType}`);
              }}
            >
              <Ionicons name="ticket-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>View digital ticket</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryBtn} onPress={() => router.replace("/user/payments")}>
              <Text style={styles.primaryBtnText}>Go to Payments</Text>
            </Pressable>
          )}
        </View>
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
  content: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3D79AB",
    backgroundColor: "#18476C",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: { color: "#EAF6FF", fontSize: 12, fontWeight: "800" },
  statusHint: { marginTop: 10, color: "#B7D2EB", fontSize: 13, lineHeight: 18 },
  statusMeta: { marginTop: 12, gap: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  metaLabel: { color: "#8FB0CC", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  metaValue: { flex: 1, textAlign: "right", color: "#EAF6FF", fontSize: 12, fontWeight: "700" },
  timelineCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 14,
    gap: 8,
  },
  sectionTitle: { color: "#EAF6FF", fontSize: 14, fontWeight: "800" },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#3B607E",
    backgroundColor: "#0E2C47",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotActive: { backgroundColor: "#91D6FF", borderColor: "#91D6FF" },
  timelineText: { color: "#9DBAD3", fontSize: 12, fontWeight: "700" },
  timelineTextActive: { color: "#EAF6FF" },
  timelineLine: { flex: 1, height: 1, backgroundColor: "#2B4C69", marginLeft: -2 },
  inboxCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 14,
    gap: 8,
  },
  inboxHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  inboxActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  inboxSubtitle: { color: "#8FB0CC", fontSize: 11, marginTop: 4 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  refreshText: { color: "#DCEEFF", fontSize: 11, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  loadingText: { color: "#A8C5DF", fontSize: 12 },
  emptyText: { color: "#A8C5DF", fontSize: 12, lineHeight: 18 },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#214B6D",
    backgroundColor: "#0F2F4C",
    padding: 10,
  },
  noteTextWrap: { flex: 1, gap: 2 },
  noteTitle: { color: "#EAF6FF", fontSize: 12, fontWeight: "800" },
  noteMessage: { color: "#BBD3EA", fontSize: 12, lineHeight: 16 },
  actions: { marginTop: 8 },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#3A86E8",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  error: { color: "#FF9B9B", fontSize: 12, fontWeight: "700" },
  actionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A5578",
    backgroundColor: "#0B2741",
    padding: 14,
    gap: 10,
  },
  actionHint: { color: "#B7D2EB", fontSize: 12, lineHeight: 18 },
  secondaryBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3F6D91",
    backgroundColor: "#123654",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtnText: { color: "#EAF6FF", fontSize: 13, fontWeight: "700" },
  reasonCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6B2E39",
    backgroundColor: "#381B24",
    padding: 10,
    gap: 4,
  },
  reasonLabel: {
    color: "#FFC5CF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  reasonText: {
    color: "#FFE4E9",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
});
