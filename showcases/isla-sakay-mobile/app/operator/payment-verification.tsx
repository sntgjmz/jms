import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  getCargoBookings,
  getPersonBookings,
  verifyBookingPayment,
  type CargoBookingRecord,
  type PersonBookingRecord,
} from "@/services/api";

type DialogKind = "info" | "error" | "success";
type PaymentQueueItem = {
  id: string;
  bookingType: "person" | "cargo";
  title: string;
  subtitle: string;
  route: string;
  amount: number;
  paymentMethod?: string;
  paymentStatus: string;
  paymentReference?: string;
  paymentProofImageUrl?: string;
  createdAt: string;
  scheduleLabel?: string;
};

const ACTIONABLE_PAYMENT_STATUSES = new Set(["for_verification", "for_cash_collection"]);

export default function OperatorPaymentVerificationScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [personBookings, setPersonBookings] = useState<PersonBookingRecord[]>([]);
  const [cargoBookings, setCargoBookings] = useState<CargoBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  useEffect(() => {
    void loadQueue();
  }, [session]);

  async function loadQueue(showRefresh = false) {
    if (!session || session.principalType !== "BOAT_OPERATOR") {
      setIsLoading(false);
      return;
    }

    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [person, cargo] = await Promise.all([
        getPersonBookings(session.accessToken),
        getCargoBookings(session.accessToken),
      ]);
      setPersonBookings(person);
      setCargoBookings(cargo);
    } catch (err) {
      const message = extractApiMessage(err) || "Could not load the operator payment queue.";
      setDialogKind("error");
      setDialogTitle("Unable to load");
      setDialogMessage(message);
      setDialogVisible(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  const queueItems = useMemo<PaymentQueueItem[]>(() => {
    const personItems = personBookings
      .filter((item) => ACTIONABLE_PAYMENT_STATUSES.has(item.paymentStatus))
      .map((item) => ({
        id: item.id,
        bookingType: "person" as const,
        title: item.passengerName,
        subtitle: `${item.numberOfPassengers} pax`,
        route: buildRoute(item.origin, item.destination),
        amount: item.totalAmount || 0,
        paymentMethod: item.paymentMethod,
        paymentStatus: item.paymentStatus,
        paymentReference: item.paymentReference,
        paymentProofImageUrl: item.paymentProofImageUrl,
        createdAt: item.createdAt,
        scheduleLabel: item.scheduleLabel,
      }));

    const cargoItems = cargoBookings
      .filter((item) => ACTIONABLE_PAYMENT_STATUSES.has(item.paymentStatus))
      .map((item) => ({
        id: item.id,
        bookingType: "cargo" as const,
        title: item.senderName,
        subtitle: `${item.weight} kg cargo`,
        route: buildRoute(item.origin, item.destination),
        amount: item.totalAmount || 0,
        paymentMethod: item.paymentMethod,
        paymentStatus: item.paymentStatus,
        paymentReference: item.paymentReference,
        paymentProofImageUrl: item.paymentProofImageUrl,
        createdAt: item.createdAt,
        scheduleLabel: item.scheduleLabel,
      }));

    return [...personItems, ...cargoItems].sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [cargoBookings, personBookings]);

  async function approvePayment(item: PaymentQueueItem) {
    if (!session) return;
    setActiveActionId(item.id);
    setInlineError(null);
    try {
      await verifyBookingPayment(session.accessToken, item.id, true);
      setDialogKind("success");
      setDialogTitle("Payment verified");
      setDialogMessage(`${item.bookingType === "cargo" ? "Cargo" : "Passenger"} payment has been approved for this assigned trip.`);
      setDialogVisible(true);
      await loadQueue(true);
    } catch (err) {
      const message = extractApiMessage(err) || "Unable to verify this payment.";
      setDialogKind("error");
      setDialogTitle("Verification failed");
      setDialogMessage(message);
      setDialogVisible(true);
    } finally {
      setActiveActionId(null);
    }
  }

  async function submitReject(item: PaymentQueueItem) {
    if (!session) return;
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setInlineError("Please enter the reason before rejecting this payment.");
      return;
    }

    setActiveActionId(item.id);
    setInlineError(null);
    try {
      await verifyBookingPayment(session.accessToken, item.id, false, trimmedReason);
      setRejectingId(null);
      setRejectReason("");
      setDialogKind("success");
      setDialogTitle("Payment rejected");
      setDialogMessage("The rejection reason was saved and the user will be notified.");
      setDialogVisible(true);
      await loadQueue(true);
    } catch (err) {
      const message = extractApiMessage(err) || "Unable to reject this payment.";
      setInlineError(message);
      setDialogKind("error");
      setDialogTitle("Rejection failed");
      setDialogMessage(message);
      setDialogVisible(true);
    } finally {
      setActiveActionId(null);
    }
  }

  function openReject(itemId: string) {
    setRejectingId(itemId);
    setRejectReason("");
    setInlineError(null);
  }

  function closeReject() {
    setRejectingId(null);
    setRejectReason("");
    setInlineError(null);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F4FAFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Verification</Text>
        <Pressable style={styles.iconButton} onPress={() => void loadQueue(true)}>
          <Ionicons name="refresh" size={22} color="#F4FAFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Operator Queue</Text>
          <Text style={styles.title}>Assigned Trip Payments</Text>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>
              {isRefreshing ? "Refreshing..." : `${queueItems.length} awaiting payment action`}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="small" color="#5CB8FF" />
            <Text style={styles.helperText}>Loading assigned payment queue...</Text>
          </View>
        ) : queueItems.length === 0 ? (
          <View style={styles.centerCard}>
            <Ionicons name="checkmark-done-outline" size={28} color="#6FC2A7" />
            <Text style={styles.emptyTitle}>Queue is clear</Text>
            <Text style={styles.helperText}>No pending cash or uploaded receipt is waiting for this operator right now.</Text>
          </View>
        ) : (
          <View style={styles.queueList}>
            {queueItems.map((item) => {
              const isBusy = activeActionId === item.id;
              const isRejecting = rejectingId === item.id;
              const isCash = (item.paymentMethod ?? "").toLowerCase() === "cash";
              const approveLabel = isCash ? "Mark cash collected" : "Verify payment";

              return (
                <View key={item.id} style={styles.queueCard}>
                  <View style={styles.queueHeader}>
                    <View style={styles.queueTypePill}>
                      <Text style={styles.queueTypePillText}>{item.bookingType === "cargo" ? "Cargo" : "Passenger"}</Text>
                    </View>
                    <View style={[styles.statusPill, isCash ? styles.statusCash : styles.statusGcash]}>
                      <Text style={styles.statusPillText}>{statusLabel(item.paymentStatus)}</Text>
                    </View>
                  </View>

                  <Text style={styles.queueTitle}>{item.title}</Text>
                  <Text style={styles.queueSubtitle}>{item.subtitle}</Text>
                  <Text style={styles.routeText}>{item.route}</Text>

                  <View style={styles.metaGrid}>
                    <MetaCard label="Amount" value={formatCurrency(item.amount)} hint={item.paymentMethod?.toUpperCase() || "N/A"} />
                    <MetaCard label="Reference" value={item.paymentReference?.trim() || "No reference"} hint={formatDateTime(item.createdAt)} />
                  </View>

                  <View style={styles.scheduleCard}>
                    <Text style={styles.scheduleLabel}>Assigned schedule</Text>
                    <Text style={styles.scheduleValue}>{item.scheduleLabel?.trim() || "Schedule label unavailable"}</Text>
                  </View>

                  {item.paymentProofImageUrl ? (
                    <View style={styles.proofCard}>
                      <Text style={styles.proofLabel}>Uploaded payment proof</Text>
                      <Image source={{ uri: item.paymentProofImageUrl }} style={styles.proofImage} contentFit="cover" />
                    </View>
                  ) : (
                    <View style={styles.noteCard}>
                      <Text style={styles.noteText}>
                        {isCash
                          ? "Cash collection booking. Verify only after you have confirmed payment personally."
                          : "No screenshot was attached to this payment yet."}
                      </Text>
                    </View>
                  )}

                  {isRejecting ? (
                    <View style={styles.rejectPanel}>
                      <Text style={styles.rejectTitle}>Reject this payment</Text>
                      <Text style={styles.rejectCopy}>
                        Add a clear reason so the user understands what needs to be corrected before re-submitting.
                      </Text>
                      <TextInput
                        value={rejectReason}
                        onChangeText={(value) => {
                          setRejectReason(value);
                          if (inlineError) setInlineError(null);
                        }}
                        placeholder="Example: Screenshot is blurry or wrong reference number."
                        placeholderTextColor="#7999B7"
                        multiline
                        style={styles.rejectInput}
                      />
                      {inlineError ? <Text style={styles.rejectError}>{inlineError}</Text> : null}
                      <View style={styles.actionRow}>
                        <Pressable style={[styles.secondaryButton, styles.cancelAction]} onPress={closeReject} disabled={isBusy}>
                          <Text style={styles.secondaryButtonText}>Back</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.secondaryButton, styles.rejectAction, isBusy && styles.buttonDisabled]}
                          onPress={() => void submitReject(item)}
                          disabled={isBusy}
                        >
                          <Text style={styles.secondaryButtonText}>{isBusy ? "Saving..." : "Confirm reject"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                        onPress={() => void approvePayment(item)}
                        disabled={isBusy}
                      >
                        <Text style={styles.primaryButtonText}>{isBusy ? "Saving..." : approveLabel}</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryButton} onPress={() => openReject(item.id)} disabled={isBusy}>
                        <Text style={styles.secondaryButtonText}>Reject</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
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

function MetaCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaHint}>{hint}</Text>
    </View>
  );
}

function extractApiMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.payload && typeof error.payload === "object") {
      const payload = error.payload as { message?: string; error?: string };
      if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
      if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
    }
    return `Request failed (${error.status}).`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return null;
}

function buildRoute(origin?: string | null, destination?: string | null) {
  const from = origin?.trim() || "Origin";
  const to = destination?.trim() || "Destination";
  return `${from} -> ${to}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function statusLabel(status: string) {
  if (status === "for_cash_collection") return "Cash collection";
  if (status === "for_verification") return "For verification";
  return status.replaceAll("_", " ");
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
  content: { padding: 18, gap: 16, paddingBottom: 30 },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#173753",
    backgroundColor: "#0C2238",
    padding: 18,
    gap: 10,
  },
  eyebrow: { color: "#76BDFC", fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  title: { color: "#F7FBFF", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  subtitle: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  summaryPill: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#14314A",
    borderWidth: 1,
    borderColor: "#295375",
  },
  summaryPillText: { color: "#CFE5F8", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  centerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#173753",
    backgroundColor: "#0C2238",
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { color: "#F6FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  helperText: { color: "#8FAFCC", fontSize: 13, lineHeight: 18, textAlign: "center" },
  queueList: { gap: 14 },
  queueCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#1B456B",
    backgroundColor: "#0C2238",
    padding: 16,
    gap: 12,
  },
  queueHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  queueTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#27557C",
    backgroundColor: "#12304A",
  },
  queueTypePillText: { color: "#D9EBF8", fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusCash: { backgroundColor: "#17364F", borderColor: "#4E8ABB" },
  statusGcash: { backgroundColor: "#103A38", borderColor: "#29C29A" },
  statusPillText: { color: "#F5FAFF", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  queueTitle: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  queueSubtitle: { color: "#A8C4DB", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  routeText: { color: "#77BFFC", fontSize: 13, lineHeight: 17, fontWeight: "700" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1A3B5A",
    backgroundColor: "#13304B",
    padding: 12,
    gap: 4,
  },
  metaLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  metaValue: { color: "#F6FBFF", fontSize: 15, lineHeight: 19, fontWeight: "800" },
  metaHint: { color: "#7B99B6", fontSize: 11, lineHeight: 15 },
  scheduleCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1A3B5A",
    backgroundColor: "#112B44",
    padding: 12,
    gap: 4,
  },
  scheduleLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  scheduleValue: { color: "#D9EBF8", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  proofCard: { gap: 8 },
  proofLabel: { color: "#CFE5F8", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  proofImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#244D73",
    backgroundColor: "#10243A",
  },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#244D73",
    backgroundColor: "#112B44",
    padding: 12,
  },
  noteText: { color: "#A8C4DB", fontSize: 12, lineHeight: 17 },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#2F74E8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryButtonText: { color: "#F8FBFF", fontSize: 12, lineHeight: 15, fontWeight: "800" },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#335E86",
    backgroundColor: "#17364F",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  secondaryButtonText: { color: "#E8F3FF", fontSize: 12, lineHeight: 15, fontWeight: "800" },
  buttonDisabled: { opacity: 0.55 },
  rejectPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#30506E",
    backgroundColor: "#102A42",
    padding: 14,
    gap: 10,
  },
  rejectTitle: { color: "#F7FBFF", fontSize: 15, lineHeight: 19, fontWeight: "800" },
  rejectCopy: { color: "#A8C4DB", fontSize: 12, lineHeight: 17 },
  rejectInput: {
    minHeight: 92,
    textAlignVertical: "top",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#295375",
    backgroundColor: "#14314A",
    color: "#F7FBFF",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    lineHeight: 17,
  },
  rejectError: { color: "#FF9DB1", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  cancelAction: { backgroundColor: "#17364F", borderColor: "#335E86" },
  rejectAction: { backgroundColor: "#9A4055", borderColor: "#9A4055" },
});
