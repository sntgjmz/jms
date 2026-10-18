import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import {
  ApiError,
  getCargoBookings,
  getPersonBookings,
  getPublicSchedules,
  updateScheduleTripStatus,
  type CargoBookingRecord,
  type PersonBookingRecord,
  type PublicScheduleConfig,
} from "@/services/api";

const PASSENGER_FLOW = ["preparing", "boarding", "final_call", "departure", "in_transit", "arrived", "completed"];
const CARGO_FLOW = ["preparing", "out_for_delivery", "delivered", "completed"];
const PASSENGER_TRANSITIONS: Record<string, string[]> = {
  preparing: ["delayed", "cancelled"],
  delayed: ["preparing", "cancelled"],
  boarding: ["delayed", "cancelled"],
  final_call: ["delayed", "cancelled"],
  departure: ["cancelled"],
  in_transit: ["arrived", "cancelled"],
  arrived: ["completed"],
  completed: [],
  cancelled: [],
};
const CARGO_TRANSITIONS: Record<string, string[]> = {
  preparing: ["delayed", "cancelled"],
  delayed: ["preparing", "cancelled"],
  out_for_delivery: ["cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};
type ActionMode = "delay" | "cancel" | null;

export default function OperatorTripExecutionScreen() {
  const router = useRouter();
  const { scheduleId } = useLocalSearchParams<{ scheduleId?: string }>();
  const { session } = useAuth();
  const [schedule, setSchedule] = useState<PublicScheduleConfig | null>(null);
  const [personBookings, setPersonBookings] = useState<PersonBookingRecord[]>([]);
  const [cargoBookings, setCargoBookings] = useState<CargoBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [actionReason, setActionReason] = useState("");
  const [delayTime, setDelayTime] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void loadTrip();
  }, [scheduleId, session]);

  async function loadTrip() {
    if (!session || session.principalType !== "BOAT_OPERATOR" || !scheduleId) {
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
      const matched = schedules.find((item) => item.id === scheduleId) ?? null;
      if (!matched) {
        setError("Schedule not found.");
        setSchedule(null);
      } else {
        const operatorMatches = matched.operatorId?.trim() === String(session.principalId)
          || matched.operatorName?.trim().toLowerCase() === session.username.trim().toLowerCase();
        if (!operatorMatches) {
          setError("This trip is not assigned to the logged-in operator.");
          setSchedule(null);
        } else {
          setSchedule(matched);
          setPersonBookings(person.filter((item) => item.scheduleId === matched.id));
          setCargoBookings(cargo.filter((item) => item.scheduleId === matched.id));
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Trip details failed to load (${err.status}).`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load trip details.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const tripFlow = useMemo(
    () => (schedule?.boatType?.trim().toLowerCase() === "cargo" ? CARGO_FLOW : PASSENGER_FLOW),
    [schedule?.boatType],
  );
  const transitionMap = useMemo(
    () => (schedule?.boatType?.trim().toLowerCase() === "cargo" ? CARGO_TRANSITIONS : PASSENGER_TRANSITIONS),
    [schedule?.boatType],
  );

  const currentStatus = normalizeStatus(schedule?.tripStatus);
  const currentStepIndex = Math.max(tripFlow.indexOf(currentStatus === "delayed" ? "preparing" : currentStatus), 0);
  const sequentialNextStatus = tripFlow[currentStepIndex + 1] ?? null;
  const specialTransitions = transitionMap[currentStatus] ?? [];
  const nextStatus = currentStatus === "delayed"
    ? "preparing"
    : currentStatus === "cancelled" || currentStatus === "completed" ? null : sequentialNextStatus;
  const departureAt = toDateValue(schedule?.departureDatetime ?? schedule?.departure);
  const arrivalAt = toDateValue(schedule?.arrivalDatetime ?? schedule?.arrival);
  const countdownLabel = formatDepartureCountdown(departureAt);
  const pendingPassenger = personBookings.filter((item) => ACTIVE_BOOKING_STATUSES.has(item.status)).length;
  const pendingCargo = cargoBookings.filter((item) => ACTIVE_BOOKING_STATUSES.has(item.status)).length;
  const verifiedPassenger = personBookings.filter((item) => item.paymentStatus === "verified").length;
  const verifiedCargo = cargoBookings.filter((item) => item.paymentStatus === "verified").length;

  async function onAdvanceStatus() {
    if (!session || !schedule || !nextStatus) return;
    setIsUpdating(true);
    setError(null);
    try {
      const updated = await updateScheduleTripStatus(session.accessToken, schedule.id, {
        status: nextStatus,
      });
      setSchedule(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(extractApiMessage(err.payload) || `Status update failed (${err.status}).`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to update trip status.");
      }
    } finally {
      setIsUpdating(false);
    }
  }

  function openAction(mode: Exclude<ActionMode, null>) {
    setActionMode(mode);
    setActionReason("");
    setDelayTime("");
    setActionError(null);
  }

  function closeAction() {
    setActionMode(null);
    setActionReason("");
    setDelayTime("");
    setActionError(null);
  }

  async function submitAction() {
    if (!session || !schedule || !actionMode) return;

    const trimmedReason = actionReason.trim();
    if (!trimmedReason) {
      setActionError("Please provide a reason before updating this trip.");
      return;
    }

    let estimatedDepartureDatetime: string | undefined;
    if (actionMode === "delay") {
      const trimmedTime = delayTime.trim();
      if (!/^\d{2}:\d{2}$/.test(trimmedTime)) {
        setActionError("Please enter the new estimated departure time using HH:MM.");
        return;
      }
      const baseDate = (schedule.departureDatetime ?? schedule.departure ?? "").slice(0, 10);
      if (!baseDate) {
        setActionError("This schedule has no departure date to anchor the delayed ETA.");
        return;
      }
      estimatedDepartureDatetime = `${baseDate}T${trimmedTime}`;
    }

    setIsUpdating(true);
    setError(null);
    setActionError(null);
    try {
      const updated = await updateScheduleTripStatus(session.accessToken, schedule.id, {
        status: actionMode === "delay" ? "delayed" : "cancelled",
        reason: trimmedReason,
        estimatedDepartureDatetime,
      });
      setSchedule(updated);
      closeAction();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = extractApiMessage(err.payload) || `Status update failed (${err.status}).`;
        setActionError(detail);
        setError(detail);
      } else if (err instanceof Error) {
        setActionError(err.message);
        setError(err.message);
      } else {
        setActionError("Unable to update trip status.");
        setError("Unable to update trip status.");
      }
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F4FAFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Trip Execution</Text>
        <Pressable style={styles.iconButton} onPress={() => void loadTrip()}>
          <Ionicons name="refresh" size={22} color="#F4FAFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="small" color="#5CB8FF" />
            <Text style={styles.helper}>Loading assigned trip...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Trip loading failed</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        ) : schedule ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Assigned Schedule</Text>
              <Text style={styles.tripTitle}>{schedule.boatName || schedule.route}</Text>
              <Text style={styles.routeText}>{schedule.origin || "From"} {"->"} {schedule.destination || "Destination"}</Text>

              <View style={styles.heroChipRow}>
                <View style={styles.heroChip}>
                  <Ionicons
                    name={schedule.boatType?.trim().toLowerCase() === "cargo" ? "cube-outline" : "boat-outline"}
                    size={14}
                    color="#9BD4FF"
                  />
                  <Text style={styles.heroChipText}>{schedule.boatType?.trim() ? statusCase(schedule.boatType) : "Passenger banca"}</Text>
                </View>
                <View style={styles.heroChip}>
                  <Ionicons name="people-outline" size={14} color="#9BD4FF" />
                  <Text style={styles.heroChipText}>{schedule.availableSeats ?? 0} / {schedule.capacity ?? 0} slots</Text>
                </View>
                {countdownLabel ? (
                  <View style={styles.heroChip}>
                    <Ionicons name="time-outline" size={14} color="#9BD4FF" />
                    <Text style={styles.heroChipText}>{countdownLabel}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.statusStrip}>
                <View style={[styles.statusPill, statusPillStyle(currentStatus)]}>
                  <Text style={styles.statusPillText}>{statusLabel(schedule.tripStatus)}</Text>
                </View>
                <Text style={styles.statusCopy}>{statusMessage(currentStatus)}</Text>
              </View>

              <View style={styles.tripInfoGrid}>
                <InfoCard label="Departure" value={formatScheduleDate(departureAt)} hint={formatTime(departureAt)} />
                <InfoCard label="Arrival" value={formatScheduleDate(arrivalAt)} hint={formatTime(arrivalAt)} />
                <InfoCard label="Passengers" value={String(pendingPassenger)} hint={`${personBookings.length} total bookings`} />
                <InfoCard label="Cargo" value={String(pendingCargo)} hint={`${cargoBookings.length} total bookings`} />
              </View>

              <Image source={require("../../assets/images/maps.png")} style={styles.mapImage} contentFit="cover" />
              <Text style={styles.mapHint}>Static route preview for the assigned trip. Operator flow uses manual status updates instead of live GPS polling.</Text>
            </View>

            <View style={styles.timelineCard}>
              <Text style={styles.sectionTitle}>Trip State Flow</Text>
              <View style={styles.stepList}>
                {tripFlow.map((step, index) => {
                  const isDone = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <View key={step} style={styles.stepRow}>
                      <View style={[
                        styles.stepDot,
                        isDone && styles.stepDotDone,
                        isCurrent && styles.stepDotCurrent,
                      ]} />
                      <View style={styles.stepCopy}>
                        <Text style={[styles.stepTitle, isCurrent && styles.stepTitleCurrent]}>{statusLabel(step)}</Text>
                        <Text style={styles.stepHint}>{operatorStepCopy(step)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.dispatchCallout}>
                <Text style={styles.dispatchCalloutLabel}>Next operator action</Text>
                <Text style={styles.dispatchCalloutTitle}>
                  {nextStatus ? `Mark this trip as ${statusLabel(nextStatus)}` : "Trip is already at its final state"}
                </Text>
                <Text style={styles.dispatchCalloutCopy}>
                  {nextStatus
                    ? nextActionCopy(nextStatus, schedule.boatType?.trim().toLowerCase() === "cargo")
                    : "No further progress action is required for this trip unless you need to review the manifest."}
                </Text>
              </View>

              <Pressable
                style={[styles.primaryButton, (!nextStatus || isUpdating) && styles.primaryButtonDisabled]}
                onPress={() => void onAdvanceStatus()}
                disabled={!nextStatus || isUpdating}
              >
                <Text style={styles.primaryButtonText}>
                  {isUpdating ? "Updating..." : nextStatus ? `Tap to mark ${statusLabel(nextStatus)}` : "Trip already at final state"}
                </Text>
              </Pressable>

              {(specialTransitions.includes("delayed") || specialTransitions.includes("cancelled")) && currentStatus !== "cancelled" ? (
                <View style={styles.secondaryActionsRow}>
                  {specialTransitions.includes("delayed") ? (
                    <Pressable
                      style={[styles.secondaryButton, styles.delayButton]}
                      onPress={() => openAction("delay")}
                      disabled={isUpdating}
                    >
                      <Text style={styles.secondaryButtonText}>Delay Trip</Text>
                    </Pressable>
                  ) : null}
                  {specialTransitions.includes("cancelled") ? (
                    <Pressable
                      style={[styles.secondaryButton, styles.cancelButton]}
                      onPress={() => openAction("cancel")}
                      disabled={isUpdating}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel Trip</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {actionMode ? (
                <View style={styles.actionPanel}>
                  <View style={styles.actionPanelHeader}>
                    <Text style={styles.actionPanelTitle}>{actionMode === "delay" ? "Delay This Trip" : "Cancel This Trip"}</Text>
                    <Pressable style={styles.actionPanelClose} onPress={closeAction}>
                      <Ionicons name="close" size={18} color="#CFE5F8" />
                    </Pressable>
                  </View>
                  <Text style={styles.actionPanelCopy}>
                    {actionMode === "delay"
                      ? "Provide the reason and the new estimated departure time so booked users receive the updated ETA."
                      : "Provide the cancellation reason so booked users know exactly why this trip will not continue."}
                  </Text>

                  <Text style={styles.fieldLabel}>Reason</Text>
                  <TextInput
                    value={actionReason}
                    onChangeText={(value) => {
                      setActionReason(value);
                      if (actionError) setActionError(null);
                    }}
                    placeholder={actionMode === "delay" ? "Example: Heavy rain and rough waters" : "Example: Vessel issue at the dock"}
                    placeholderTextColor="#7A98B5"
                    multiline
                    style={[styles.textInput, styles.textArea]}
                  />

                  {actionMode === "delay" ? (
                    <>
                      <Text style={styles.fieldLabel}>New estimated departure time</Text>
                      <TextInput
                        value={delayTime}
                        onChangeText={(value) => {
                          setDelayTime(value);
                          if (actionError) setActionError(null);
                        }}
                        placeholder="HH:MM"
                        placeholderTextColor="#7A98B5"
                        style={styles.textInput}
                      />
                      <Text style={styles.fieldHint}>
                        Use 24-hour format. The same schedule date will be used for the ETA.
                      </Text>
                    </>
                  ) : null}

                  {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

                  <View style={styles.actionPanelButtons}>
                    <Pressable style={[styles.actionButton, styles.actionButtonMuted]} onPress={closeAction} disabled={isUpdating}>
                      <Text style={styles.actionButtonMutedText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionButton,
                        actionMode === "delay" ? styles.actionButtonWarning : styles.actionButtonDanger,
                        isUpdating && styles.primaryButtonDisabled,
                      ]}
                      onPress={() => void submitAction()}
                      disabled={isUpdating}
                    >
                      <Text style={styles.actionButtonText}>{isUpdating ? "Saving..." : actionMode === "delay" ? "Confirm Delay" : "Confirm Cancel"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.manifestCard}>
              <Text style={styles.sectionTitle}>Booking Manifest</Text>
              <View style={styles.manifestSummaryRow}>
                <MiniStat icon="people-outline" label="Passenger queue" value={`${pendingPassenger}`} detail={`${verifiedPassenger} verified`} />
                <MiniStat icon="cube-outline" label="Cargo queue" value={`${pendingCargo}`} detail={`${verifiedCargo} verified`} />
              </View>

              {personBookings.length > 0 ? (
                <View style={styles.manifestBlock}>
                  <Text style={styles.manifestTitle}>Passenger bookings</Text>
                  {personBookings.map((item) => (
                    <View key={item.id} style={styles.manifestItem}>
                      <View style={styles.manifestItemCopy}>
                        <Text style={styles.manifestName}>{item.passengerName}</Text>
                        <Text style={styles.manifestDetail}>
                          {item.numberOfPassengers} pax | {item.paymentStatus} | {item.status}
                        </Text>
                      </View>
                      <Text style={styles.manifestAmount}>{formatCurrency(item.totalAmount || 0)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {cargoBookings.length > 0 ? (
                <View style={styles.manifestBlock}>
                  <Text style={styles.manifestTitle}>Cargo bookings</Text>
                  {cargoBookings.map((item) => (
                    <View key={item.id} style={styles.manifestItem}>
                      <View style={styles.manifestItemCopy}>
                        <Text style={styles.manifestName}>{item.senderName} {"->"} {item.receiverName}</Text>
                        <Text style={styles.manifestDetail}>
                          {item.weight} kg | {item.paymentStatus} | {item.status}
                        </Text>
                      </View>
                      <Text style={styles.manifestAmount}>{formatCurrency(item.totalAmount || 0)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {personBookings.length === 0 && cargoBookings.length === 0 ? (
                <Text style={styles.emptyManifest}>No bookings are attached to this schedule yet.</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoHint}>{hint}</Text>
    </View>
  );
}

function MiniStat({ icon, label, value, detail }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; detail: string }) {
  return (
    <View style={styles.miniStatCard}>
      <View style={styles.miniStatIconWrap}>
        <Ionicons name={icon} size={18} color="#6FB9FF" />
      </View>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatDetail}>{detail}</Text>
    </View>
  );
}

function extractApiMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { message?: string; error?: string }).message ?? (payload as { error?: string }).error;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return null;
}

function toDateValue(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(status?: string | null) {
  return status?.trim().toLowerCase() || "preparing";
}

function statusLabel(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "boarding": return "Boarding";
    case "final_call": return "Final Call";
    case "departure": return "Departed";
    case "in_transit": return "In Transit";
    case "arrived": return "Arrived";
    case "completed": return "Completed";
    case "delayed": return "Delayed";
    case "cancelled": return "Cancelled";
    case "out_for_delivery": return "Out for Delivery";
    case "delivered": return "Delivered";
    default: return "Preparing";
  }
}

function statusMessage(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "delayed": return "Trip has been delayed and users will see the updated estimated departure time.";
    case "boarding": return "Passengers can now prepare to board.";
    case "final_call": return "Last boarding call is now active.";
    case "departure": return "Boat has departed from the dock.";
    case "in_transit": return "Trip is now in progress.";
    case "arrived": return "Boat has reached the destination.";
    case "completed": return "Trip has been fully completed.";
    case "cancelled": return "Trip has been cancelled and booked users will be notified.";
    case "out_for_delivery": return "Cargo is now on the way.";
    case "delivered": return "Cargo has been delivered.";
    default: return "Waiting for the operator to begin the trip sequence.";
  }
}

function operatorStepCopy(status: string) {
  switch (status) {
    case "boarding": return "Tap when passenger boarding begins at the dock.";
    case "final_call": return "Tap when only final call remains before departure.";
    case "departure": return "Tap once the boat has left the port.";
    case "in_transit": return "Tap when the trip is actively crossing.";
    case "arrived": return "Tap once the boat arrives at destination.";
    case "completed": return "Tap after unloading and final completion.";
    case "out_for_delivery": return "Tap when cargo is already on the way.";
    case "delivered": return "Tap when cargo is handed over to receiver.";
    default: return "Initial state before any operator progress action.";
  }
}

function nextActionCopy(status: string, isCargo: boolean) {
  switch (status) {
    case "boarding":
      return "Confirm boarding when passengers are already lining up and the vessel is ready to receive them.";
    case "final_call":
      return "Use final call when last-minute boarding has started and you are preparing to close the manifest.";
    case "departure":
      return "Mark departed once the vessel leaves the dock so passengers stop waiting for boarding instructions.";
    case "in_transit":
      return "Update to in transit once the vessel is actively crossing and the trip has fully started.";
    case "arrived":
      return "Mark arrived as soon as the vessel reaches the destination dock and unloading can begin.";
    case "completed":
      return isCargo
        ? "Complete the trip after cargo handoff is fully done and this route is ready to close."
        : "Complete the trip after unloading and final passenger disembarkation are fully done.";
    case "out_for_delivery":
      return "Use this when cargo has already left the port and is officially on the way to the receiver.";
    case "delivered":
      return "Mark delivered once the cargo is handed over and confirmed by the receiving side.";
    case "preparing":
      return "Resume the trip once the delay is cleared and the vessel is ready to proceed again.";
    default:
      return "Review the manifest and update the trip only when the actual dock activity changes.";
  }
}

function formatScheduleDate(value: Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

function formatTime(value: Date | null) {
  if (!value) return "Time unavailable";
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatDepartureCountdown(value: Date | null) {
  if (!value) return null;
  const diff = value.getTime() - Date.now();
  if (diff <= 0) return "Departed window started";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `Departs in ${minutes}m`;
  return `Departs in ${hours}h ${minutes}m`;
}

function statusCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusPillStyle(status: string) {
  if (status === "delayed") return { backgroundColor: "#4B3410", borderColor: "#9B6A20" };
  if (status === "boarding" || status === "final_call") return { backgroundColor: "#123859", borderColor: "#2F74E8" };
  if (status === "in_transit" || status === "out_for_delivery" || status === "departure") return { backgroundColor: "#103D38", borderColor: "#29C29A" };
  if (status === "completed" || status === "arrived" || status === "delivered") return { backgroundColor: "#143321", borderColor: "#44C276" };
  return { backgroundColor: "#15324D", borderColor: "#315D88" };
}

const ACTIVE_BOOKING_STATUSES = new Set(["pending", "pending_payment", "for_verification", "for_cash_collection", "confirmed"]);

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
    width: 46, height: 46, borderRadius: 16, backgroundColor: "#12334F",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: "#F7FBFF", fontSize: 20, lineHeight: 24, fontWeight: "800" },
  content: { padding: 18, gap: 16, paddingBottom: 30 },
  centerCard: {
    borderRadius: 22, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238",
    padding: 20, alignItems: "center", gap: 12,
  },
  helper: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  errorCard: { borderRadius: 22, borderWidth: 1, borderColor: "#5A2436", backgroundColor: "#26131B", padding: 18, gap: 8 },
  errorTitle: { color: "#FFD7DE", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  errorMessage: { color: "#FFB0BF", fontSize: 13, lineHeight: 18 },
  heroCard: { borderRadius: 24, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 14 },
  eyebrow: { color: "#76BDFC", fontSize: 11, lineHeight: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  tripTitle: { color: "#F7FBFF", fontSize: 24, lineHeight: 28, fontWeight: "800" },
  routeText: { color: "#B4CAE0", fontSize: 14, lineHeight: 18, fontWeight: "600" },
  heroChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1E4A72",
    backgroundColor: "#10304B",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChipText: { color: "#D4E8F9", fontSize: 11, lineHeight: 14, fontWeight: "700" },
  statusStrip: { gap: 8 },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  statusPillText: { color: "#F7FBFF", fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  statusCopy: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
  tripInfoGrid: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  infoCard: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 12, gap: 4 },
  infoLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  infoValue: { color: "#F6FBFF", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  infoHint: { color: "#7B99B6", fontSize: 11, lineHeight: 15 },
  mapImage: { width: "100%", height: 220, borderRadius: 20, overflow: "hidden" },
  mapHint: { color: "#7B99B6", fontSize: 12, lineHeight: 16 },
  timelineCard: { borderRadius: 24, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 16 },
  sectionTitle: { color: "#F7FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  stepList: { gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4, borderWidth: 2, borderColor: "#315D88" },
  stepDotDone: { backgroundColor: "#29C29A", borderColor: "#29C29A" },
  stepDotCurrent: { backgroundColor: "#5CB8FF", borderColor: "#5CB8FF" },
  stepCopy: { flex: 1, gap: 2 },
  stepTitle: { color: "#D3E4F3", fontSize: 13, lineHeight: 17, fontWeight: "700" },
  stepTitleCurrent: { color: "#F7FBFF" },
  stepHint: { color: "#7EA2C3", fontSize: 12, lineHeight: 16 },
  dispatchCallout: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#27557C",
    backgroundColor: "#112F49",
    padding: 14,
    gap: 5,
  },
  dispatchCalloutLabel: { color: "#76BDFC", fontSize: 10, lineHeight: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  dispatchCalloutTitle: { color: "#F7FBFF", fontSize: 15, lineHeight: 19, fontWeight: "800" },
  dispatchCalloutCopy: { color: "#A9C4DB", fontSize: 12, lineHeight: 17 },
  primaryButton: { minHeight: 48, borderRadius: 16, backgroundColor: "#2F74E8", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: "#F8FBFF", fontSize: 13, lineHeight: 16, fontWeight: "800", textAlign: "center" },
  secondaryActionsRow: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  delayButton: { backgroundColor: "#3C2B11", borderColor: "#9A7128" },
  cancelButton: { backgroundColor: "#3D1B23", borderColor: "#8F3449" },
  secondaryButtonText: { color: "#F7FBFF", fontSize: 12, lineHeight: 15, fontWeight: "800" },
  actionPanel: {
    marginTop: 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#224766",
    backgroundColor: "#102A42",
    padding: 14,
    gap: 10,
  },
  actionPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  actionPanelTitle: { flex: 1, color: "#F6FBFF", fontSize: 15, lineHeight: 19, fontWeight: "800" },
  actionPanelClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C5577",
    backgroundColor: "#17364F",
    alignItems: "center",
    justifyContent: "center",
  },
  actionPanelCopy: { color: "#9AB7D1", fontSize: 12, lineHeight: 17 },
  fieldLabel: { color: "#CFE5F8", fontSize: 11, lineHeight: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  textInput: {
    minHeight: 44,
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
  textArea: { minHeight: 88, textAlignVertical: "top" },
  fieldHint: { color: "#7EA2C3", fontSize: 11, lineHeight: 15 },
  actionError: { color: "#FF9DB1", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  actionPanelButtons: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  actionButtonMuted: { borderWidth: 1, borderColor: "#315A7C", backgroundColor: "#17364F" },
  actionButtonWarning: { backgroundColor: "#B7852C" },
  actionButtonDanger: { backgroundColor: "#A13B4F" },
  actionButtonText: { color: "#FFFFFF", fontSize: 12, lineHeight: 15, fontWeight: "800" },
  actionButtonMutedText: { color: "#D9EBF8", fontSize: 12, lineHeight: 15, fontWeight: "800" },
  manifestCard: { borderRadius: 24, borderWidth: 1, borderColor: "#173753", backgroundColor: "#0C2238", padding: 18, gap: 14 },
  manifestSummaryRow: { gap: 10, flexDirection: "row", flexWrap: "wrap" },
  miniStatCard: { width: "48%", borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B", padding: 12, gap: 4 },
  miniStatIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#10304B",
    borderWidth: 1,
    borderColor: "#21547E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  miniStatLabel: { color: "#7EA2C3", fontSize: 10, lineHeight: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  miniStatValue: { color: "#F6FBFF", fontSize: 18, lineHeight: 22, fontWeight: "800" },
  miniStatDetail: { color: "#7B99B6", fontSize: 11, lineHeight: 15 },
  manifestBlock: { gap: 10 },
  manifestTitle: { color: "#D7E8F7", fontSize: 13, lineHeight: 17, fontWeight: "800" },
  manifestItem: {
    borderRadius: 16, borderWidth: 1, borderColor: "#1A3B5A", backgroundColor: "#13304B",
    padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
  manifestItemCopy: { flex: 1, gap: 3 },
  manifestName: { color: "#F6FBFF", fontSize: 13, lineHeight: 17, fontWeight: "700" },
  manifestDetail: { color: "#7B99B6", fontSize: 11, lineHeight: 15 },
  manifestAmount: { color: "#6FB9FF", fontSize: 12, lineHeight: 16, fontWeight: "800" },
  emptyManifest: { color: "#8FAFCC", fontSize: 13, lineHeight: 18 },
});
