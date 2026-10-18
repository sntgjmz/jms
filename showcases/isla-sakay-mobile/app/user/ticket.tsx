import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { printSampleReceipt } from "@/utils/print-sample-receipt";
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

function formatPeso(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `PHP ${value.toFixed(2)}`;
}

function toDateTimeLabel(date?: string | null, time?: string | null) {
  const combined = date && time ? `${date}T${time}` : date ? `${date}T00:00:00` : null;
  if (!combined) return "Schedule pending";
  const parsed = new Date(combined);
  if (Number.isNaN(parsed.getTime())) return date ?? "Schedule pending";
  return parsed.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ticketStatusLabel(booking?: BookingRecord | null) {
  if (!booking) return "Pending";
  if (booking.paymentStatus === "verified") return "Confirmed";
  if (booking.paymentStatus === "rejected") return "Payment rejected";
  if (booking.paymentStatus === "for_cash_collection") return "Cash collection";
  return "Under review";
}

function buildReceiptHtml(booking: BookingRecord, ticketCode: string) {
  const safe = (value?: string | number | null) => String(value ?? "-").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
  const isCargo = "cargoDescription" in booking;
  const title = isCargo ? "Cargo Booking Receipt" : "Passenger Booking Receipt";
  const scheduleLabel = toDateTimeLabel(booking.date, "time" in booking ? booking.time : null);

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; }
        .card { padding: 28px; }
        .header { display: flex; align-items: center; justify-content: space-between; }
        .title { font-size: 20px; font-weight: 700; }
        .badge { padding: 6px 12px; background: #0ea5e9; color: white; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .section { margin-top: 18px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
        .value { font-size: 14px; font-weight: 600; color: #0f172a; }
        .footer { margin-top: 16px; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title">${title}</div>
          <div class="badge">${ticketStatusLabel(booking)}</div>
        </div>
        <div class="section">
          <div class="row"><div class="label">Ticket Code</div><div class="value">${ticketCode}</div></div>
          <div class="row"><div class="label">Booking ID</div><div class="value">${safe(booking.id)}</div></div>
          <div class="row"><div class="label">Route</div><div class="value">${safe(booking.origin)} → ${safe(booking.destination)}</div></div>
          <div class="row"><div class="label">Schedule</div><div class="value">${scheduleLabel}</div></div>
          <div class="row"><div class="label">Payment</div><div class="value">${safe(booking.paymentMethod)} • ${safe(booking.paymentStatus)}</div></div>
          <div class="row"><div class="label">Amount</div><div class="value">${formatPeso(booking.totalAmount)}</div></div>
          ${isCargo ? `<div class="row"><div class="label">Cargo</div><div class="value">${safe(booking.cargoDescription)}</div></div>` : ""}
        </div>
        <div class="footer">Fictional portfolio sample. This receipt is not valid for travel or payment.</div>
      </div>
    </body>
  </html>`;
}

export default function TicketScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId, type } = useLocalSearchParams<{ bookingId?: string; type?: string }>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const ticketCode = useMemo(() => {
    if (!bookingId) return "ISL-000000";
    return `ISL-${bookingId.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase()}`;
  }, [bookingId]);

  useEffect(() => {
    let active = true;
    const fetchBooking = async () => {
      if (!session?.accessToken || !bookingId) {
        setLoading(false);
        return;
      }
      try {
        const isCargo = type === "cargo";
        const list = isCargo
          ? await getMyCargoBookings(session.accessToken)
          : await getMyPersonBookings(session.accessToken);
        if (!active) return;
        const found = list.find((item) => item.id === bookingId) ?? null;
        setBooking(found);
        setError(found ? null : "Booking not found.");
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) setError(`Unable to load booking (${err.status}).`);
        else setError("Unable to load booking.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchBooking();
    return () => {
      active = false;
    };
  }, [bookingId, session?.accessToken, type]);

  const handleSavePdf = async () => {
    if (!booking) return;
    setExporting(true);
    try {
      const html = buildReceiptHtml(booking, ticketCode);
      printSampleReceipt(html);
      setDialogKind("success");
      setDialogTitle("Receipt ready");
      setDialogMessage("The sample receipt opened in a new tab. Choose Save as PDF in your browser's print options.");
      setDialogVisible(true);
    } catch (err) {
      setDialogKind("error");
      setDialogTitle("Export failed");
      setDialogMessage(err instanceof Error ? err.message : "We couldn't open the sample receipt. Please try again.");
      setDialogVisible(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top * 0.35) }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF6FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Ticket & Receipt</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#9ED2FF" />
            <Text style={styles.loadingText}>Loading ticket…</Text>
          </View>
        ) : booking ? (
          <>
            <View style={styles.ticketCard}>
              <View style={styles.ticketBadgeRow}>
                <Text style={styles.ticketBadge}>{ticketStatusLabel(booking)}</Text>
                <Text style={styles.ticketCode}>{ticketCode}</Text>
              </View>
              <Text style={styles.ticketTitle}>
                {type === "cargo" ? "Cargo Booking" : "Passenger Booking"}
              </Text>
              <Text style={styles.ticketRoute}>
                {booking.origin} → {booking.destination}
              </Text>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Booking ID</Text>
                  <Text style={styles.metaValue}>{booking.id}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Schedule</Text>
                  <Text style={styles.metaValue}>{toDateTimeLabel(booking.date, "time" in booking ? booking.time : null)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Payment</Text>
                  <Text style={styles.metaValue}>
                    {(booking.paymentMethod ?? "cash").toUpperCase()} • {ticketStatusLabel(booking)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Total</Text>
                  <Text style={styles.metaValue}>{formatPeso(booking.totalAmount)}</Text>
                </View>
              </View>

              {"numberOfPassengers" in booking ? (
                <View style={styles.extraRow}>
                  <Ionicons name="people" size={18} color="#9ED2FF" />
                  <Text style={styles.extraText}>
                    {booking.numberOfPassengers} passenger(s)
                  </Text>
                </View>
              ) : (
                <View style={styles.extraRow}>
                  <Ionicons name="cube" size={18} color="#9ED2FF" />
                  <Text style={styles.extraText}>{booking.cargoDescription}</Text>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.primaryBtn} onPress={handleSavePdf} disabled={exporting}>
                {exporting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Print / Save PDF</Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.footerHint}>
                Fictional sample ticket. Print or save a PDF to preview the receipt design.
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.error}>{error ?? "Ticket not found."}</Text>
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
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 8 },
  loadingText: { color: "#A8C5DF", fontSize: 12 },
  ticketCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#255173",
    backgroundColor: "#0B2741",
    padding: 16,
    gap: 8,
  },
  ticketBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ticketBadge: {
    color: "#0B2A45",
    backgroundColor: "#9ED2FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "800",
  },
  ticketCode: { color: "#BBD3EA", fontSize: 11, fontWeight: "700" },
  ticketTitle: { color: "#EAF6FF", fontSize: 18, fontWeight: "800" },
  ticketRoute: { color: "#9ED2FF", fontSize: 13, fontWeight: "700" },
  metaGrid: { marginTop: 6, gap: 10 },
  metaItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#214B6D",
    backgroundColor: "#0F2F4C",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metaLabel: { color: "#8FB0CC", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  metaValue: { color: "#EAF6FF", fontSize: 13, fontWeight: "700", marginTop: 4 },
  extraRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  extraText: { color: "#DCEEFF", fontSize: 12, fontWeight: "600", flex: 1 },
  actions: { gap: 10 },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#3A86E8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  footerHint: { color: "#9DBAD3", fontSize: 12, lineHeight: 16 },
  error: { color: "#FF9B9B", fontSize: 12, fontWeight: "700" },
});
