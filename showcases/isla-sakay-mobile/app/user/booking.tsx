import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import AppDialog from "@/components/ui/AppDialog";
import {
  ApiError,
  createCargoBooking,
  createPersonBooking,
  getAppUserById,
  getPublicFares,
  getPublicSchedules,
  refreshAccessToken,
  type AppUserProfile,
  type PublicFareConfig,
  type PublicScheduleConfig,
} from "@/services/api";

type ServiceType = "motor" | "cargo";
type StepKey = "schedule" | "passengers" | "payment" | "review";
type PaymentMethod = "cash" | "gcash";
type DialogKind = "error" | "info" | "success";

function toDateKey(value?: string | null) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
}
function toTimeText(value?: string | null) {
  if (!value) return "TBD";
  const source = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}
function toLongDate(value?: string | null) {
  if (!value) return "No date";
  const source = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}
function formatPeso(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `PHP ${value.toFixed(2)}`;
}
function resolveCommuterFarePerPassenger(fare?: PublicFareConfig | null) {
  if (!fare) return 0;
  const baseFare = fare.baseFare ?? 0;
  const percentage = fare.percentagePerKilometer ?? 0;
  const extraDistance = Math.max((fare.distanceKm ?? 1) - 1, 0);
  return baseFare + baseFare * (percentage / 100) * extraDistance;
}
function resolveCargoTotal(fare?: PublicFareConfig | null, weight?: number | null) {
  if (!fare) return 0;
  const rentalFare = fare.rentalFare ?? 0;
  const weightLimit = fare.weightLimitKg ?? 0;
  const safeWeight = Math.max(0, weight ?? 0);
  const excessWeight = Math.max(0, safeWeight - weightLimit);
  return rentalFare + excessWeight * (rentalFare * 0.1);
}
function fullNameFromProfile(profile: AppUserProfile | null, fallback?: string | null) {
  const value = `${profile?.firstName ?? ""} ${profile?.middleName ?? ""} ${profile?.lastName ?? ""}`.replace(/\s+/g, " ").trim();
  if (value) return value;
  return profile?.nickname?.trim() || profile?.fullName?.trim() || fallback?.trim() || "Passenger";
}
function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}
function formatCompactDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}
function isTodayKey(value: string) {
  const today = new Date().toISOString().slice(0, 10);
  return value === today;
}
function isTomorrowKey(value: string) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return value === d.toISOString().slice(0, 10);
}
function scheduleDateTime(value?: string | null) {
  if (!value) return null;
  const source = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizeTripStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}
function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const hh = `${h}`.padStart(2, "0");
  const mm = `${m}`.padStart(2, "0");
  const ss = `${s}`.padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/[^0-9]/g, "");
}

function isValidPhMobile(value?: string | null) {
  return /^09\d{9}$/.test(normalizePhone(value));
}

function extractApiErrorMessage(error: ApiError) {
  const payload = error.payload as
    | string
    | { message?: string; error?: string; detail?: string }
    | null
    | undefined;
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
    if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail.trim();
  }
  return `Request failed with status ${error.status}.`;
}

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={[styles.step, active && styles.stepActive]}>
      <Text style={[styles.stepText, active && styles.stepTextActive]}>{label}</Text>
    </View>
  );
}
function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.counterRow}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterBox}>
        <Pressable style={styles.counterBtn} onPress={() => onChange(value - 1)}>
          <Ionicons name="remove" size={16} color="#E5F2FF" />
        </Pressable>
        <Text style={styles.counterValue}>{value}</Text>
        <Pressable style={styles.counterBtn} onPress={() => onChange(value + 1)}>
          <Ionicons name="add" size={16} color="#E5F2FF" />
        </Pressable>
      </View>
    </View>
  );
}

export default function BookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, setSession } = useAuth();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const serviceType: ServiceType = service === "cargo" ? "cargo" : "motor";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [schedules, setSchedules] = useState<PublicScheduleConfig[]>([]);
  const [fares, setFares] = useState<PublicFareConfig[]>([]);
  const [selectedFrom, setSelectedFrom] = useState("");
  const [selectedTo, setSelectedTo] = useState("");
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [step, setStep] = useState<StepKey>("schedule");
  const [passengerCount, setPassengerCount] = useState(1);
  const [seniorCount, setSeniorCount] = useState(0);
  const [pwdCount, setPwdCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gcash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofName, setPaymentProofName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [cargoDescription, setCargoDescription] = useState("");
  const [cargoWeightInput, setCargoWeightInput] = useState("");
  const [seniorIds, setSeniorIds] = useState<string[]>([]);
  const [pwdIds, setPwdIds] = useState<string[]>([]);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogAction, setDialogAction] = useState<null | (() => void)>(null);

  const loadBookingSetup = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);
      try {
        setError(null);
        const now = new Date();
        const end = new Date(now);
        end.setDate(now.getDate() + 45);
        const [p, s, f] = await Promise.all([
          getAppUserById(session.principalId, session.accessToken),
          getPublicSchedules(now.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
          getPublicFares(),
        ]);
        setProfile(p);
        setSchedules(s);
        setFares(f);
      } catch (e) {
        setError(e instanceof ApiError ? `Booking setup unavailable (${e.status}).` : "Unable to load booking setup.");
      } finally {
        if (mode === "initial") setLoading(false);
        else setRefreshing(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void loadBookingSetup("initial");
  }, [loadBookingSetup, serviceType]);

  const fareById = useMemo(() => {
    const map = new Map<string, PublicFareConfig>();
    fares.forEach((f) => map.set(f.id, f));
    return map;
  }, [fares]);
  const boatSchedules = useMemo(
    () => schedules.filter((s) => (fareById.get(s.routeFareId ?? "")?.type ?? "").toLowerCase() === "commuter"),
    [schedules, fareById],
  );
  const cargoSchedules = useMemo(
    () => schedules.filter((s) => (fareById.get(s.routeFareId ?? "")?.type ?? "").toLowerCase() === "cargo"),
    [schedules, fareById],
  );
  const bookingSchedules = useMemo(
    () => (serviceType === "cargo" ? cargoSchedules : boatSchedules),
    [boatSchedules, cargoSchedules, serviceType],
  );
  const barangayOptions = useMemo(() => {
    const set = new Set<string>();
    bookingSchedules.forEach((s) => {
      if (s.origin?.trim()) set.add(s.origin.trim());
      if (s.destination?.trim()) set.add(s.destination.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bookingSchedules]);
  const fromOptions = useMemo(() => barangayOptions.filter((v) => !selectedTo || v.toLowerCase() !== selectedTo.toLowerCase()), [barangayOptions, selectedTo]);
  const toOptions = useMemo(() => barangayOptions.filter((v) => !selectedFrom || v.toLowerCase() !== selectedFrom.toLowerCase()), [barangayOptions, selectedFrom]);
  const filteredFromOptions = useMemo(() => {
    const q = fromQuery.trim().toLowerCase();
    const list = q ? fromOptions.filter((o) => o.toLowerCase().includes(q)) : fromOptions;
    return list.slice(0, 14);
  }, [fromOptions, fromQuery]);
  const filteredToOptions = useMemo(() => {
    const q = toQuery.trim().toLowerCase();
    const list = q ? toOptions.filter((o) => o.toLowerCase().includes(q)) : toOptions;
    return list.slice(0, 14);
  }, [toOptions, toQuery]);
  const routeSchedules = useMemo(
    () =>
      bookingSchedules.filter((s) => {
        const fm = !selectedFrom || (s.origin ?? "").trim().toLowerCase() === selectedFrom.toLowerCase();
        const tm = !selectedTo || (s.destination ?? "").trim().toLowerCase() === selectedTo.toLowerCase();
        return fm && tm;
      }),
    [bookingSchedules, selectedFrom, selectedTo],
  );
  const dateCountByKey = useMemo(() => {
    const map = new Map<string, number>();
    routeSchedules.forEach((s) => {
      const key = toDateKey(s.departureDatetime ?? s.departure);
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [routeSchedules]);
  const dateOptions = useMemo(() => Array.from(dateCountByKey.keys()).sort(), [dateCountByKey]);
  useEffect(() => {
    if (!selectedDate && dateOptions.length) setSelectedDate(dateOptions[0]);
    else if (selectedDate && !dateCountByKey.has(selectedDate)) setSelectedDate(dateOptions[0] ?? "");
    setSelectedScheduleId("");
  }, [selectedFrom, selectedTo, selectedDate, dateOptions, dateCountByKey]);

  const filteredSchedules = useMemo(
    () => routeSchedules.filter((s) => !selectedDate || toDateKey(s.departureDatetime ?? s.departure) === selectedDate),
    [routeSchedules, selectedDate],
  );
  const blockedStatuses = useMemo(
    () =>
      new Set([
        "DEPARTED",
        "IN_TRANSIT",
        "ARRIVED",
        "COMPLETED",
        "CANCELLED",
        "CANCELED",
        "LANDED",
        "CLOSED",
      ]),
    [],
  );
  const scheduleBookability = useMemo(() => {
    const map = new Map<string, { bookable: boolean; reason: string }>();
    const nonBlockingCargoStatuses = new Set(["cancelled", "payment_rejected", "affected_by_cancellation", "rejected"]);
    filteredSchedules.forEach((s) => {
      const status = normalizeTripStatus(s.tripStatus);
      const available = s.availableSeats ?? 0;
      const departure = scheduleDateTime(s.departureDatetime ?? s.departure);
      let reason = "";
      if (serviceType === "cargo") {
        const cargoBlocked = Boolean(s.cargoBooked) && !nonBlockingCargoStatuses.has((s.cargoBookingStatus ?? "").trim().toLowerCase());
        if (cargoBlocked) {
          reason = (s.cargoBookingStatus ?? "").trim().toLowerCase() === "for_verification"
            ? "Cargo trip is waiting for payment verification"
            : "Cargo trip already has an active booking";
        } else if (status && blockedStatuses.has(status)) {
          reason = `Trip already ${status.toLowerCase().replace("_", " ")}`;
        } else if (departure && departure.getTime() <= nowTs) {
          reason = "Trip already departed";
        }
      } else {
        if (available <= 0) reason = "No slots available";
        else if (status && blockedStatuses.has(status)) reason = `Trip already ${status.toLowerCase().replace("_", " ")}`;
        else if (departure && departure.getTime() <= nowTs) reason = "Trip already departed";
      }
      map.set(s.id, { bookable: reason.length === 0, reason });
    });
    return map;
  }, [filteredSchedules, blockedStatuses, nowTs, serviceType]);
  const selectedSchedule = useMemo(() => filteredSchedules.find((s) => s.id === selectedScheduleId) ?? null, [filteredSchedules, selectedScheduleId]);
  const selectedFare = useMemo(() => (selectedSchedule?.routeFareId ? fareById.get(selectedSchedule.routeFareId) ?? null : null), [selectedSchedule, fareById]);
  const regularFare = useMemo(() => resolveCommuterFarePerPassenger(selectedFare), [selectedFare]);
  const cargoWeight = useMemo(() => Number.parseFloat(cargoWeightInput), [cargoWeightInput]);
  const cargoBaseFare = selectedFare?.rentalFare ?? 0;
  const cargoWeightLimit = selectedFare?.weightLimitKg ?? 0;
  const cargoExcessWeight = Math.max(0, (Number.isFinite(cargoWeight) ? cargoWeight : 0) - cargoWeightLimit);
  const cargoExcessCharge = cargoBaseFare * 0.1 * cargoExcessWeight;
  const cargoTotal = useMemo(
    () => resolveCargoTotal(selectedFare, Number.isFinite(cargoWeight) ? cargoWeight : 0),
    [selectedFare, cargoWeight],
  );
  const discountedFare = regularFare * 0.8;
  const discountedCount = seniorCount + pwdCount;
  const regularCount = Math.max(0, passengerCount - discountedCount);
  const totalAmount = regularCount * regularFare + discountedCount * discountedFare;
  const discountAmount = Math.max(0, passengerCount * regularFare - totalAmount);
  const availableSlots = selectedSchedule?.availableSeats ?? null;
  const maxPassengers = availableSlots && availableSlots > 0 ? availableSlots : null;
  const selectedScheduleState = useMemo(
    () => (selectedSchedule ? scheduleBookability.get(selectedSchedule.id) ?? { bookable: true, reason: "" } : null),
    [selectedSchedule, scheduleBookability],
  );

  const stepValidation = useMemo(() => {
    const errors: Record<string, string> = {};

    if (step === "schedule") {
      if (!selectedFrom.trim()) errors.from = "Choose the origin barangay.";
      if (!selectedTo.trim()) errors.to = "Choose the destination barangay.";
      if (!selectedDate.trim()) errors.date = "Choose a travel date.";
      if (selectedFrom.trim() && selectedTo.trim() && selectedDate.trim() && filteredSchedules.length === 0) {
        errors.scheduleSearch = "No schedules are available for this route and date.";
      }
      if (filteredSchedules.length > 0 && !selectedSchedule) {
        errors.schedule = serviceType === "cargo" ? "Choose one cargo trip to continue." : "Choose one boat schedule to continue.";
      }
      if (selectedSchedule && selectedScheduleState && !selectedScheduleState.bookable) {
        errors.schedule = selectedScheduleState.reason;
      }
      if (selectedSchedule && !selectedFare) {
        errors.scheduleFare = "This schedule does not have a valid fare configuration yet.";
      }
    }

    if (step === "passengers" && serviceType === "motor") {
      if (!isValidPhMobile(profile?.phone)) {
        errors.profilePhone = "Your profile phone must be a valid PH mobile number.";
      }
      if (!selectedFare || !(regularFare > 0)) {
        errors.fare = "Passenger fare is not available for this schedule.";
      }
      if (maxPassengers && passengerCount > maxPassengers) {
        errors.passengerCount = `Only ${maxPassengers} slot${maxPassengers > 1 ? "s" : ""} available for this boat.`;
      }
      if (discountedCount > passengerCount) {
        errors.discountCounts = "Senior + PWD count cannot exceed total passengers.";
      }
      if (seniorCount > 0 && seniorIds.some((id) => !id.trim())) {
        errors.seniorIds = "Enter one senior ID per senior passenger.";
      }
      if (pwdCount > 0 && pwdIds.some((id) => !id.trim())) {
        errors.pwdIds = "Enter one PWD ID per PWD passenger.";
      }
    }

    if (step === "passengers" && serviceType === "cargo") {
      if (!isValidPhMobile(profile?.phone)) {
        errors.profilePhone = "Your profile phone must be a valid PH mobile number.";
      }
      if (!receiverName.trim()) errors.receiverName = "Receiver full name is required.";
      if (!receiverPhone.trim()) errors.receiverPhone = "Receiver phone number is required.";
      else if (!isValidPhMobile(receiverPhone)) errors.receiverPhone = "Use a valid PH mobile number like 09xxxxxxxxx.";
      if (!cargoDescription.trim()) errors.cargoDescription = "Describe the cargo you want to ship.";
      if (!Number.isFinite(cargoWeight) || cargoWeight <= 0) errors.cargoWeight = "Enter a valid cargo weight in kilograms.";
      if (!selectedFare) errors.fare = "Cargo fare is not available for this schedule.";
      if (!(cargoTotal > 0)) errors.cargoTotal = "We could not compute the total for this cargo trip.";
    }

    if (step === "payment" && paymentMethod === "gcash") {
      if (!paymentReference.trim()) errors.paymentReference = "Enter your GCash reference number.";
      if (!paymentProofUrl.trim()) errors.paymentProof = "Upload your payment screenshot from the gallery.";
    }

    return errors;
  }, [
    step,
    serviceType,
    selectedFrom,
    selectedTo,
    selectedDate,
    filteredSchedules.length,
    selectedSchedule,
    selectedScheduleState,
    selectedFare,
    regularFare,
    profile?.phone,
    maxPassengers,
    passengerCount,
    discountedCount,
    seniorCount,
    seniorIds,
    pwdCount,
    pwdIds,
    receiverName,
    receiverPhone,
    cargoDescription,
    cargoWeight,
    cargoTotal,
    paymentMethod,
    paymentReference,
    paymentProofUrl,
  ]);
  const currentStepValid = Object.keys(stepValidation).length === 0;
  const firstStepValidationMessage = Object.values(stepValidation)[0] ?? null;

  const monthDays = useMemo(() => {
    const first = startOfMonth(visibleMonth);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const key = cur.toISOString().slice(0, 10);
      return { key, day: cur.getDate(), inMonth: cur.getMonth() === first.getMonth(), count: dateCountByKey.get(key) ?? 0 };
    });
  }, [visibleMonth, dateCountByKey]);
  const quickDateOptions = useMemo(() => dateOptions.slice(0, 10), [dateOptions]);

  useEffect(() => {
    if (maxPassengers && passengerCount > maxPassengers) {
      setPassengerCount(maxPassengers);
      if (seniorCount + pwdCount > maxPassengers) {
        const overflow = seniorCount + pwdCount - maxPassengers;
        const nextPwd = Math.max(0, pwdCount - overflow);
        const rem = overflow - (pwdCount - nextPwd);
        setPwdCount(nextPwd);
        setSeniorCount(Math.max(0, seniorCount - rem));
      }
    }
  }, [maxPassengers, passengerCount, seniorCount, pwdCount]);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSeniorIds((prev) => {
      if (seniorCount <= prev.length) return prev.slice(0, seniorCount);
      return [...prev, ...Array.from({ length: seniorCount - prev.length }, () => "")];
    });
  }, [seniorCount]);

  useEffect(() => {
    setPwdIds((prev) => {
      if (pwdCount <= prev.length) return prev.slice(0, pwdCount);
      return [...prev, ...Array.from({ length: pwdCount - prev.length }, () => "")];
    });
  }, [pwdCount]);

  function showDialog(kind: DialogKind, title: string, message: string, onClose?: () => void) {
    setDialogKind(kind);
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogAction(() => (onClose ? onClose : null));
    setDialogVisible(true);
  }

  function closeDialog() {
    const action = dialogAction;
    setDialogVisible(false);
    setDialogAction(null);
    if (action) action();
  }

  function updatePassengers(next: number) {
    const upper = maxPassengers ?? Number.MAX_SAFE_INTEGER;
    const v = Math.max(1, Math.min(next, upper));
    setPassengerCount(v);
    if (seniorCount + pwdCount > v) {
      let overflow = seniorCount + pwdCount - v;
      const nextPwd = Math.max(0, pwdCount - overflow);
      overflow -= pwdCount - nextPwd;
      setPwdCount(nextPwd);
      setSeniorCount(Math.max(0, seniorCount - overflow));
    }
  }
  function updateSenior(next: number) {
    const v = Math.max(0, next);
    if (v + pwdCount > passengerCount) return;
    setSeniorCount(v);
    setSeniorIds((prev) => {
      if (v <= prev.length) return prev.slice(0, v);
      return [...prev, ...Array.from({ length: v - prev.length }, () => "")];
    });
  }
  function updatePwd(next: number) {
    const v = Math.max(0, next);
    if (v + seniorCount > passengerCount) return;
    setPwdCount(v);
    setPwdIds((prev) => {
      if (v <= prev.length) return prev.slice(0, v);
      return [...prev, ...Array.from({ length: v - prev.length }, () => "")];
    });
  }

  function updateSeniorId(index: number, value: string) {
    setSeniorIds((prev) => prev.map((item, i) => (i === index ? value : item)));
  }
  function updatePwdId(index: number, value: string) {
    setPwdIds((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function nextStep() {
    if (step === "schedule") {
      if (!selectedFrom.trim()) {
        return showDialog("error", "From barangay required", "Please choose the origin barangay before continuing.");
      }
      if (!selectedTo.trim()) {
        return showDialog("error", "To barangay required", "Please choose the destination barangay before continuing.");
      }
      if (!selectedDate.trim()) {
        return showDialog("error", "Travel date required", "Please choose a schedule date before continuing.");
      }
      if (filteredSchedules.length === 0) {
        return showDialog(
          "error",
          serviceType === "cargo" ? "No cargo trips found" : "No boats found",
          "There are no available schedules for the route and date you selected.",
        );
      }
      if (!selectedSchedule) {
        return showDialog(
          "info",
          serviceType === "cargo" ? "Choose a cargo trip" : "Choose a boat",
          "Tap one schedule card to continue to the next step.",
        );
      }
      const selectedState = scheduleBookability.get(selectedSchedule.id);
      if (selectedState && !selectedState.bookable) {
        setError(selectedState.reason);
        return showDialog("error", "Trip not available", selectedState.reason);
      }
      if (!selectedFare) {
        return showDialog("error", "Fare unavailable", "This schedule does not have a valid fare configuration yet.");
      }
      setError(null);
      setStep("passengers");
      return;
    }
    if (step === "passengers" && selectedSchedule) {
      const selectedState = scheduleBookability.get(selectedSchedule.id);
      if (selectedState && !selectedState.bookable) {
        setError(selectedState.reason);
        return showDialog("error", "Trip not available", selectedState.reason);
      }
    }
    if (serviceType === "cargo" && step === "passengers") {
      if (!receiverName.trim()) return showDialog("error", "Receiver required", "Please enter the receiver's full name.");
      if (!receiverPhone.trim()) return showDialog("error", "Receiver phone required", "Please enter the receiver's phone number.");
      if (!isValidPhMobile(receiverPhone)) return showDialog("error", "Invalid receiver phone", "Receiver phone must be a valid PH mobile number like 09xxxxxxxxx.");
      if (!cargoDescription.trim()) return showDialog("error", "Cargo details required", "Please describe the cargo you want to ship.");
      if (!Number.isFinite(cargoWeight) || cargoWeight <= 0) return showDialog("error", "Weight required", "Please enter a valid cargo weight in kilograms.");
      if (!selectedFare) return showDialog("error", "Fare unavailable", "This cargo schedule does not have a valid fare configuration yet.");
      if (!(cargoTotal > 0)) return showDialog("error", "Total unavailable", "We could not compute the cargo total for this schedule.");
      if (!isValidPhMobile(profile?.phone)) return showDialog("error", "Profile phone required", "Your profile phone number must be a valid PH mobile number before you can book cargo.");
      setError(null);
      setStep("payment");
      return;
    }
    if (step === "passengers" && !isValidPhMobile(profile?.phone)) {
      setError("Your profile phone number must be a valid PH mobile number.");
      return showDialog("error", "Profile phone required", "Your profile phone number must be a valid PH mobile number before you can continue.");
    }
    if (step === "passengers" && !selectedFare) {
      setError("This schedule does not have a valid fare configuration.");
      return showDialog("error", "Fare unavailable", "This schedule does not have a valid fare configuration yet.");
    }
    if (step === "passengers" && !(regularFare > 0)) {
      setError("We could not compute the passenger fare for this schedule.");
      return showDialog("error", "Fare unavailable", "We could not compute the passenger fare for this schedule.");
    }
    if (step === "passengers" && maxPassengers && passengerCount > maxPassengers) {
      setError(`Selected boat only has ${maxPassengers} available slot${maxPassengers > 1 ? "s" : ""}.`);
      return showDialog("error", "Seat limit reached", `This boat currently has only ${maxPassengers} available slots.`);
    }
    if (step === "passengers" && discountedCount > passengerCount) {
      setError("Senior + PWD count cannot exceed total passengers.");
      return showDialog("error", "Invalid passenger counts", "Senior + PWD cannot be greater than total passengers.");
    }
    if (step === "passengers" && seniorCount > 0 && seniorIds.some((id) => !id.trim())) {
      setError("Please enter all senior citizen ID numbers.");
      return showDialog("error", "Missing Senior ID", "Each senior citizen needs one valid ID number.");
    }
    if (step === "passengers" && pwdCount > 0 && pwdIds.some((id) => !id.trim())) {
      setError("Please enter all PWD ID numbers.");
      return showDialog("error", "Missing PWD ID", "Each PWD passenger needs one valid ID number.");
    }
    if (step === "payment" && paymentMethod === "gcash" && !paymentReference.trim()) {
      return showDialog("error", "Payment needed", "Enter your GCash reference number before continuing.");
    }
    if (step === "payment" && paymentMethod === "gcash" && !paymentProofUrl.trim()) {
      return showDialog("error", "Proof required", "Please upload your GCash screenshot before continuing.");
    }
    setError(null);
    if (step === "passengers") setStep("payment");
    else if (step === "payment") setStep("review");
  }

  function onSearchSchedules() {
    if (!selectedFrom || !selectedTo) {
      showDialog("info", "Select route", "Please choose both From and To barangay.");
      return;
    }
    if (!selectedDate && quickDateOptions.length > 0) {
      setSelectedDate(quickDateOptions[0]);
    }
  }

  function clearFilters() {
    setFromQuery("");
    setToQuery("");
    setSelectedFrom("");
    setSelectedTo("");
    setSelectedDate("");
    setSelectedScheduleId("");
  }

  async function pickPaymentProof() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog("info", "Permission needed", "Please allow photo library access to upload your payment screenshot.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
      selectionLimit: 1,
      legacy: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      showDialog("error", "Image error", "Could not read image data. Please try another screenshot.");
      return;
    }
    const mime = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    setPaymentProofUrl(`data:${mime};base64,${asset.base64}`);
    setPaymentProofName(asset.fileName ?? "receipt.jpg");
  }

  async function submitBooking() {
    if (!session || !selectedSchedule || !selectedDate) return;
    const selectedState = scheduleBookability.get(selectedSchedule.id);
    if (selectedState && !selectedState.bookable) {
      setError(selectedState.reason);
      showDialog("error", "Trip not available", selectedState.reason);
      return;
    }
    if (maxPassengers && passengerCount > maxPassengers) {
      setError(`Seat limit exceeded. Max allowed for this boat is ${maxPassengers}.`);
      showDialog("error", "Seat limit reached", `Maximum passengers for this boat is ${maxPassengers}.`);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      let activeToken = session.accessToken;
      const accessExpiryTime = Date.parse(session.accessExpiresAt);
      const shouldRefresh =
        !!session.refreshToken &&
        Number.isFinite(accessExpiryTime) &&
        accessExpiryTime - Date.now() <= 60_000;

      if (shouldRefresh && session.refreshToken) {
        const refreshed = await refreshAccessToken(session.refreshToken);
        const nextSession = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? session.refreshToken,
          sessionId: refreshed.sessionId,
          principalType: refreshed.principalType,
          principalId: refreshed.principalId,
          username: refreshed.username,
          accessExpiresAt: refreshed.accessExpiresAt,
        };
        await setSession(nextSession);
        activeToken = refreshed.accessToken;
      }

      const created = serviceType === "cargo"
        ? await createCargoBooking(activeToken, {
            senderName: fullNameFromProfile(profile, session.username),
            senderPhone: profile?.phone ?? "",
            receiverName: receiverName.trim(),
            receiverPhone: receiverPhone.trim(),
            cargoDescription: cargoDescription.trim(),
            weight: cargoWeight,
            destination: selectedSchedule.destination ?? selectedTo,
            origin: selectedSchedule.origin ?? selectedFrom,
            date: selectedDate,
            boatId: selectedSchedule.boatId ?? undefined,
            scheduleId: selectedSchedule.id,
            totalAmount: cargoTotal,
            paymentMethod,
            paymentReference: paymentReference.trim() || undefined,
            paymentProofImageUrl: paymentProofUrl.trim() || undefined,
          })
        : await createPersonBooking(activeToken, {
            passengerName: fullNameFromProfile(profile, session.username),
            passengerPhone: profile?.phone ?? "",
            numberOfPassengers: passengerCount,
            seniorCitizenCount: seniorCount,
            pwdCount,
            seniorCitizenIds: seniorCount > 0 ? seniorIds.map((id) => id.trim()).filter(Boolean) : undefined,
            pwdIds: pwdCount > 0 ? pwdIds.map((id) => id.trim()).filter(Boolean) : undefined,
            destination: selectedSchedule.destination ?? selectedTo,
            origin: selectedSchedule.origin ?? selectedFrom,
            date: selectedDate,
            time: toTimeText(selectedSchedule.departureDatetime ?? selectedSchedule.departure),
            boatId: selectedSchedule.boatId ?? undefined,
            scheduleId: selectedSchedule.id,
            farePerPassenger: regularFare,
            discountAmount,
            totalAmount,
            paymentMethod,
            paymentReference: paymentReference.trim() || undefined,
            paymentProofImageUrl: paymentProofUrl.trim() || undefined,
          });
      showDialog(
        "success",
        "Booking submitted",
        "Your booking is now pending payment verification.",
        () => router.replace({ pathname: "/user/payment-wait", params: { bookingId: created.id, type: serviceType } }),
      );
    } catch (e) {
      if (e instanceof ApiError) {
        const message = extractApiErrorMessage(e);
        setError(message);
        showDialog("error", "Booking failed", message);
      } else {
        setError("Unable to submit booking.");
        showDialog("error", "Booking failed", "Unable to submit booking right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.head, { paddingTop: Math.max(8, insets.top * 0.1) }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}><Ionicons name="arrow-back" size={17} color="#E7F4FF" /></Pressable>
        <Text style={styles.headTitle}>{serviceType === "cargo" ? "Cargo Banca Booking" : "Motor Banca Booking"}</Text>
        <Pressable
          style={[styles.iconBtn, (refreshing || loading) && styles.iconBtnMuted]}
          disabled={refreshing || loading}
          onPress={() => void loadBookingSetup("refresh")}>
          {refreshing ? <ActivityIndicator size="small" color="#E7F4FF" /> : <Ionicons name="refresh" size={17} color="#E7F4FF" />}
        </Pressable>
      </View>
      <View style={styles.steps}>
        <StepPill label="Route" active={step === "schedule"} />
        <StepPill label={serviceType === "cargo" ? "Cargo" : "Pax"} active={step === "passengers"} />
        <StepPill label="Pay" active={step === "payment"} />
        <StepPill label="Review" active={step === "review"} />
      </View>
      {loading ? <View style={styles.loader}><ActivityIndicator size="large" color="#6AB6FF" /><Text style={styles.hint}>Loading schedules...</Text></View> : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: Math.max(26, insets.bottom + 18) }} showsVerticalScrollIndicator={false}>
          {step === "schedule" && (
            <View style={styles.card}>

              <Text style={[styles.filterLabel, styles.mt]}>From Barangay</Text>
              <View style={[styles.filterBar, stepValidation.from && styles.fieldShellError]}>
                <Ionicons name="locate-outline" size={16} color="#9FC5E7" />
                <TextInput
                  value={fromQuery}
                  onChangeText={setFromQuery}
                  placeholder={selectedFrom || "Binangonan Port"}
                  placeholderTextColor="#8EACC7"
                  style={styles.filterInput}
                />
              </View>
              {stepValidation.from ? <Text style={styles.helperError}>{stepValidation.from}</Text> : null}
              

              <Text style={[styles.filterLabel, styles.mt]}>To Barangay</Text>
              <View style={[styles.filterBar, stepValidation.to && styles.fieldShellError]}>
                <Ionicons name="location-outline" size={16} color="#9FC5E7" />
                <TextInput
                  value={toQuery}
                  onChangeText={setToQuery}
                  placeholder={selectedTo || "Drop off to?"}
                  placeholderTextColor="#8EACC7"
                  style={styles.filterInput}
                />
              </View>
              {stepValidation.to ? <Text style={styles.helperError}>{stepValidation.to}</Text> : null}

              <View style={styles.filterActions}>
                <Pressable style={styles.searchBtn} onPress={onSearchSchedules}>
                  <Text style={styles.searchBtnText}>Search schedules</Text>
                </Pressable>
                <Pressable style={styles.clearBtn} onPress={clearFilters}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
              </View>

              <View style={styles.oneWayHeader}>
                <Text style={styles.oneWayTitle}>One-way Date</Text>
                <View style={styles.oneWayActions}>
                  <Pressable style={styles.smallDateBtn} onPress={() => setShowCalendar(true)}>
                    <Ionicons name="calendar-outline" size={13} color="#D7E9FB" />
                    <Text style={styles.smallDateBtnText}>Calendar</Text>
                  </Pressable>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickDateRow}>
                {quickDateOptions.map((dateKey) => {
                  const active = selectedDate === dateKey;
                  return (
                    <Pressable key={dateKey} style={[styles.quickDateCard, active && styles.quickDateCardActive]} onPress={() => setSelectedDate(dateKey)}>
                      <Text style={[styles.quickDateTop, active && styles.quickDateTopActive]}>{formatCompactDate(dateKey)}</Text>
                      <Text style={[styles.quickDateBottom, active && styles.quickDateBottomActive]}>
                        {isTodayKey(dateKey) ? "Today" : isTomorrowKey(dateKey) ? "Tomorrow" : ""}
                        {dateCountByKey.get(dateKey) ? `${isTodayKey(dateKey) || isTomorrowKey(dateKey) ? " • " : ""}${dateCountByKey.get(dateKey)} available` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {stepValidation.date ? <Text style={styles.helperError}>{stepValidation.date}</Text> : null}

              <View style={styles.availabilityGuide}>
                <Text style={styles.guideLabel}>Slots guide:</Text>
                <View style={[styles.guideBadge, { borderColor: "#29B57A" }]}><Text style={[styles.guideBadgeText, { color: "#7EF5C5" }]}>High</Text></View>
                <View style={[styles.guideBadge, { borderColor: "#2789D8" }]}><Text style={[styles.guideBadgeText, { color: "#8FD0FF" }]}>Medium</Text></View>
                <View style={[styles.guideBadge, { borderColor: "#E68F1B" }]}><Text style={[styles.guideBadgeText, { color: "#FFC97A" }]}>Low</Text></View>
                <View style={[styles.guideBadge, { borderColor: "#CC3553" }]}><Text style={[styles.guideBadgeText, { color: "#FF9DB0" }]}>Full</Text></View>
              </View>

              <Text style={styles.metaInfo}>{filteredSchedules.length} schedule{filteredSchedules.length === 1 ? "" : "s"} available</Text>
              {!filteredSchedules.length ? (
                <Text style={[styles.hint, styles.mt]}>No schedules for current filters.</Text>
              ) : (
                filteredSchedules.map((s) => {
                  const bookState = scheduleBookability.get(s.id) ?? { bookable: true, reason: "" };
                  const departureAt = scheduleDateTime(s.departureDatetime ?? s.departure);
                  const secondsToDeparture = departureAt ? Math.floor((departureAt.getTime() - nowTs) / 1000) : null;
                  const tripStatus = normalizeTripStatus(s.tripStatus);
                  const countdownText =
                    secondsToDeparture != null && secondsToDeparture > 0 ? `Departs in ${formatDuration(secondsToDeparture)}` : null;
                  const statusLabel = !bookState.bookable
                    ? secondsToDeparture != null && secondsToDeparture <= 0
                      ? "DEPARTED"
                      : tripStatus || "UNAVAILABLE"
                    : tripStatus || "SCHEDULED";
                  const badgeStyle =
                    statusLabel === "SCHEDULED"
                      ? styles.statusBadgeScheduled
                      : statusLabel === "DEPARTED" || statusLabel === "ARRIVED" || statusLabel === "COMPLETED"
                        ? styles.statusBadgeEnded
                        : styles.statusBadgeOther;
                  return (
                  <Pressable
                    key={s.id}
                    disabled={!bookState.bookable}
                    style={[styles.schedule, selectedScheduleId === s.id && styles.scheduleActive, !bookState.bookable && styles.scheduleDisabled]}
                    onPress={() => {
                      if (!bookState.bookable) {
                        showDialog("error", "Trip not available", bookState.reason || "This trip is not available for booking.");
                        return;
                      }
                      setSelectedScheduleId(s.id);
                      setStep("passengers");
                    }}>
                    <Text style={styles.scheduleTitle}>{(s.boatName ?? s.id)} • {(s.origin ?? "Unknown")} {" -> "} {(s.destination ?? "Unknown")}</Text>
                    <View style={styles.scheduleHeaderRow}>
                      <Text style={styles.scheduleTitleMain} numberOfLines={1}>
                        {(s.boatName ?? s.id)} | {(s.origin ?? "Unknown")} {" -> "} {(s.destination ?? "Unknown")}
                      </Text>
                      <View style={[styles.statusBadge, badgeStyle]}>
                        <Text style={styles.statusBadgeText}>{statusLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleGrid}>
                      <View style={styles.scheduleCell}>
                        <Text style={styles.scheduleCellLabel}>Operator</Text>
                        <Text style={styles.scheduleCellValue} numberOfLines={1}>{s.operatorName ?? "Unassigned"}</Text>
                      </View>
                      <View style={styles.scheduleCell}>
                        <Text style={styles.scheduleCellLabel}>Time</Text>
                        <Text style={styles.scheduleCellValue}>{toTimeText(s.departureDatetime ?? s.departure)} - {toTimeText(s.arrivalDatetime ?? s.arrival)}</Text>
                      </View>
                      <View style={styles.scheduleCell}>
                        <Text style={styles.scheduleCellLabel}>
                          {serviceType === "cargo" ? "Weight Limit" : "Slots"}
                        </Text>
                        <Text style={styles.scheduleCellValue}>
                          {serviceType === "cargo" 
                            ? `${s.capacity ?? "-"} kg` 
                            : `${s.availableSeats ?? "-"} / ${s.capacity ?? "-"}`}
                        </Text>
                      </View>
                      <View style={styles.scheduleCell}>
                        <Text style={styles.scheduleCellLabel}>
                          {serviceType === "cargo" ? "Base Fare" : "Fare"}
                        </Text>
                        <Text style={styles.scheduleCellValue}>
                          {formatPeso(
                            serviceType === "cargo"
                              ? (fareById.get(s.routeFareId ?? "")?.rentalFare ?? 0)
                              : resolveCommuterFarePerPassenger(fareById.get(s.routeFareId ?? "") ?? null),
                          )}
                        </Text>
                      </View>
                    </View>
                    {countdownText ? <Text style={styles.scheduleCountdown}>{countdownText}</Text> : null}
                    <Text style={!bookState.bookable ? styles.tapBlocked : styles.tapToChoose}>
                      {!bookState.bookable ? bookState.reason : "Tap to choose this boat"}
                    </Text>
                  </Pressable>
                  );
                })
              )}
              {stepValidation.scheduleSearch ? <Text style={styles.helperError}>{stepValidation.scheduleSearch}</Text> : null}
              {stepValidation.schedule ? <Text style={styles.helperError}>{stepValidation.schedule}</Text> : null}
              {stepValidation.scheduleFare ? <Text style={styles.helperError}>{stepValidation.scheduleFare}</Text> : null}
            </View>
          )}
          {step === "passengers" && serviceType !== "cargo" && (
            <View style={styles.card}>
              <Text style={styles.title}>Trip Details</Text>
              <Text style={styles.hint}>{selectedSchedule?.boatName ?? "TBD"} • {(selectedSchedule?.origin ?? selectedFrom) || "From"} {" -> "} {(selectedSchedule?.destination ?? selectedTo) || "To"}</Text>

              <View style={styles.tripStatRow}>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="flag-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>State</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{selectedSchedule?.tripStatus ? selectedSchedule.tripStatus.toUpperCase() : "SCHEDULED"}</Text>
                </View>
              </View>

              <View style={styles.tripStatFullCard}>
                <View style={styles.tripStatTop}>
                  <Ionicons name="person-circle-outline" size={14} color="#8FC8FF" />
                  <Text style={styles.tripStatLabel}>Operator</Text>
                </View>
                <Text style={styles.tripStatValue}>{selectedSchedule?.operatorName ?? "Unassigned"}</Text>
              </View>

              <View style={styles.tripStatRow}>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="people-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Available</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{maxPassengers ?? "Unknown"} slots</Text>
                </View>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="boat-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Capacity</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{selectedSchedule?.capacity ?? "-"} seats</Text>
                </View>
              </View>

              <View style={styles.tripStatRow}>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="log-out-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Departure</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{toLongDate(selectedSchedule?.departureDatetime ?? selectedSchedule?.departure)}</Text>
                  <Text style={styles.tripStatSub}>{toTimeText(selectedSchedule?.departureDatetime ?? selectedSchedule?.departure)}</Text>
                </View>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="log-in-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Arrival</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{toLongDate(selectedSchedule?.arrivalDatetime ?? selectedSchedule?.arrival)}</Text>
                  <Text style={styles.tripStatSub}>{toTimeText(selectedSchedule?.arrivalDatetime ?? selectedSchedule?.arrival)}</Text>
                </View>
              </View>

              <View style={styles.fareRuleCard}>
                <View style={styles.tripStatTop}>
                  <Ionicons name="cash-outline" size={14} color="#8FC8FF" />
                  <Text style={styles.tripStatLabel}>Fare Rule</Text>
                </View>
                <Text style={styles.fareRuleValue}>{formatPeso(regularFare)} per passenger</Text>
                <Text style={styles.fareRuleHint}>Senior/PWD fare uses 20% discount.</Text>
              </View>

              <Text style={styles.sectionTitle}>Passenger Type</Text>
              <Counter label="Total passengers" value={passengerCount} onChange={updatePassengers} />
              <Counter label="Senior citizens" value={seniorCount} onChange={updateSenior} />
              <Counter label="PWD" value={pwdCount} onChange={updatePwd} />

              <View style={styles.discountCard}>
                <View style={styles.discountHead}>
                  <Text style={styles.discountTitle}>Discount Breakdown</Text>
                  <View style={styles.discountBadge}><Text style={styles.discountBadgeText}>20% off</Text></View>
                </View>
                <Text style={styles.hint}>Senior and PWD passengers need one valid ID number each.</Text>
                {stepValidation.profilePhone ? <Text style={styles.helperError}>{stepValidation.profilePhone}</Text> : null}
                {stepValidation.passengerCount ? <Text style={styles.helperError}>{stepValidation.passengerCount}</Text> : null}
                {stepValidation.discountCounts ? <Text style={styles.helperError}>{stepValidation.discountCounts}</Text> : null}
                {!!seniorCount && (
                  <View style={styles.idsWrap}>
                    <Text style={styles.idGroupTitle}>Senior ID Numbers</Text>
                    {seniorIds.map((value, index) => (
                      <TextInput
                        key={`senior-${index}`}
                        style={[styles.input, stepValidation.seniorIds && styles.inputError]}
                        value={value}
                        onChangeText={(text) => updateSeniorId(index, text)}
                        placeholder={`Senior #${index + 1} ID`}
                        placeholderTextColor="#8EACC7"
                      />
                    ))}
                    {stepValidation.seniorIds ? <Text style={styles.helperError}>{stepValidation.seniorIds}</Text> : null}
                  </View>
                )}
                {!!pwdCount && (
                  <View style={styles.idsWrap}>
                    <Text style={styles.idGroupTitle}>PWD ID Numbers</Text>
                    {pwdIds.map((value, index) => (
                      <TextInput
                        key={`pwd-${index}`}
                        style={[styles.input, stepValidation.pwdIds && styles.inputError]}
                        value={value}
                        onChangeText={(text) => updatePwdId(index, text)}
                        placeholder={`PWD #${index + 1} ID`}
                        placeholderTextColor="#8EACC7"
                      />
                    ))}
                    {stepValidation.pwdIds ? <Text style={styles.helperError}>{stepValidation.pwdIds}</Text> : null}
                  </View>
                )}
              </View>

              <View style={styles.fareBreakdownCard}>
                <Text style={styles.hint}>Regular {regularCount} × {formatPeso(regularFare)}</Text>
                <Text style={styles.hint}>Discounted {discountedCount} × {formatPeso(discountedFare)}</Text>
                <Text style={styles.hint}>Discount total: -{formatPeso(discountAmount)}</Text>
                <Text style={styles.total}>Estimated Total: {formatPeso(totalAmount)}</Text>
                {stepValidation.fare ? <Text style={styles.helperError}>{stepValidation.fare}</Text> : null}
              </View>
            </View>
          )}
          {step === "passengers" && serviceType === "cargo" && (
            <View style={styles.card}>
              <Text style={styles.title}>Cargo Details</Text>
              <Text style={styles.hint}>{selectedSchedule?.boatName ?? "TBD"} • {(selectedSchedule?.origin ?? selectedFrom) || "From"} {" -> "} {(selectedSchedule?.destination ?? selectedTo) || "To"}</Text>

              <View style={styles.tripStatRow}>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="flag-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>State</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{selectedSchedule?.tripStatus ? selectedSchedule.tripStatus.toUpperCase() : "SCHEDULED"}</Text>
                </View>
              </View>

              <View style={styles.tripStatFullCard}>
                <View style={styles.tripStatTop}>
                  <Ionicons name="person-circle-outline" size={14} color="#8FC8FF" />
                  <Text style={styles.tripStatLabel}>Operator</Text>
                </View>
                <Text style={styles.tripStatValue}>{selectedSchedule?.operatorName ?? "Unassigned"}</Text>
              </View>

              <View style={styles.tripStatRow}>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="cube-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Capacity</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{selectedSchedule?.capacity ?? "-"} kg</Text>
                </View>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="cash-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Base Fare</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{formatPeso(cargoBaseFare)}</Text>
                </View>
              </View>

              <View style={styles.tripStatRow}>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="speedometer-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Weight Limit</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{cargoWeightLimit} kg</Text>
                </View>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="person-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Sender</Text>
                  </View>
                  <Text style={styles.tripStatValue} numberOfLines={2}>{fullNameFromProfile(profile, session?.username)}</Text>
                  <Text style={styles.tripStatSub}>{profile?.phone ?? "Phone not set"}</Text>
                </View>
              </View>

              <View style={styles.tripStatRow}>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="log-out-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Departure</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{toLongDate(selectedSchedule?.departureDatetime ?? selectedSchedule?.departure)}</Text>
                  <Text style={styles.tripStatSub}>{toTimeText(selectedSchedule?.departureDatetime ?? selectedSchedule?.departure)}</Text>
                </View>
                <View style={styles.tripStatCard}>
                  <View style={styles.tripStatTop}>
                    <Ionicons name="log-in-outline" size={14} color="#8FC8FF" />
                    <Text style={styles.tripStatLabel}>Arrival</Text>
                  </View>
                  <Text style={styles.tripStatValue}>{toLongDate(selectedSchedule?.arrivalDatetime ?? selectedSchedule?.arrival)}</Text>
                  <Text style={styles.tripStatSub}>{toTimeText(selectedSchedule?.arrivalDatetime ?? selectedSchedule?.arrival)}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Receiver</Text>
              <TextInput
                style={[styles.input, stepValidation.receiverName && styles.inputError]}
                value={receiverName}
                onChangeText={setReceiverName}
                placeholder="Receiver full name"
                placeholderTextColor="#8EACC7"
              />
              {stepValidation.receiverName ? <Text style={styles.helperError}>{stepValidation.receiverName}</Text> : null}
              <TextInput
                style={[styles.input, styles.mt, stepValidation.receiverPhone && styles.inputError]}
                value={receiverPhone}
                onChangeText={setReceiverPhone}
                placeholder="Receiver phone number"
                placeholderTextColor="#8EACC7"
                keyboardType="phone-pad"
              />
              {stepValidation.receiverPhone ? <Text style={styles.helperError}>{stepValidation.receiverPhone}</Text> : null}

              <Text style={styles.sectionTitle}>Cargo Information</Text>
              <TextInput
                style={[styles.input, stepValidation.cargoDescription && styles.inputError]}
                value={cargoDescription}
                onChangeText={setCargoDescription}
                placeholder="Describe the cargo contents"
                placeholderTextColor="#8EACC7"
                multiline
              />
              {stepValidation.cargoDescription ? <Text style={styles.helperError}>{stepValidation.cargoDescription}</Text> : null}
              <TextInput
                style={[styles.input, styles.mt, stepValidation.cargoWeight && styles.inputError]}
                value={cargoWeightInput}
                onChangeText={setCargoWeightInput}
                placeholder="Weight in kilograms"
                keyboardType="decimal-pad"
                placeholderTextColor="#8EACC7"
              />
              {stepValidation.cargoWeight ? <Text style={styles.helperError}>{stepValidation.cargoWeight}</Text> : null}

              <View style={styles.fareBreakdownCard}>
                <Text style={styles.hint}>Base rental fare: {formatPeso(cargoBaseFare)}</Text>
                <Text style={styles.hint}>Included weight: {cargoWeightLimit} kg</Text>
                <Text style={styles.hint}>Cargo weight: {cargoWeight || 0} kg</Text>
                <Text style={styles.hint}>Excess weight: {cargoExcessWeight} kg</Text>
                <Text style={styles.hint}>Excess charge: {formatPeso(cargoExcessCharge)}</Text>
                <Text style={styles.total}>Estimated Total: {formatPeso(cargoTotal)}</Text>
                {stepValidation.profilePhone ? <Text style={styles.helperError}>{stepValidation.profilePhone}</Text> : null}
                {stepValidation.fare ? <Text style={styles.helperError}>{stepValidation.fare}</Text> : null}
                {stepValidation.cargoTotal ? <Text style={styles.helperError}>{stepValidation.cargoTotal}</Text> : null}
              </View>
            </View>
          )}
          {step === "payment" && (
            <View style={styles.card}>
              <Text style={styles.title}>Payment Method</Text>
              <Text style={styles.hint}>Choose how you want to pay for this trip.</Text>
              <View style={styles.payRow}>
                <Pressable style={[styles.pay, paymentMethod === "gcash" && styles.payActive]} onPress={() => setPaymentMethod("gcash")}>
                  <View style={styles.payTop}>
                    <Ionicons name="phone-portrait-outline" size={15} color="#DFF1FF" />
                    <Text style={styles.payTitle}>GCash</Text>
                  </View>
                  <Text style={styles.payHint}>Upload screenshot proof</Text>
                </Pressable>
                <Pressable style={[styles.pay, paymentMethod === "cash" && styles.payActive]} onPress={() => setPaymentMethod("cash")}>
                  <View style={styles.payTop}>
                    <Ionicons name="cash-outline" size={15} color="#DFF1FF" />
                    <Text style={styles.payTitle}>Cash</Text>
                  </View>
                  <Text style={styles.payHint}>Pay on-site</Text>
                </Pressable>
              </View>

              {paymentMethod === "gcash" && (
                <View style={styles.paymentDetailCard}>
                  <Text style={styles.inputLabel}>Reference Number</Text>
                  <TextInput
                    style={[styles.input, stepValidation.paymentReference && styles.inputError]}
                    value={paymentReference}
                    onChangeText={setPaymentReference}
                    placeholder="e.g. 1234-5678-9012"
                    placeholderTextColor="#8EACC7"
                  />
                  {stepValidation.paymentReference ? <Text style={styles.helperError}>{stepValidation.paymentReference}</Text> : null}
                  <Text style={[styles.inputLabel, styles.mt]}>Payment Screenshot</Text>
                  <Pressable style={styles.uploadBtn} onPress={() => void pickPaymentProof()}>
                    <Ionicons name="image-outline" size={16} color="#D8EAFB" />
                    <Text style={styles.uploadBtnText}>{paymentProofName ? "Change screenshot" : "Upload screenshot"}</Text>
                  </Pressable>
                  {paymentProofName ? <Text style={styles.uploadInfo}>Selected: {paymentProofName}</Text> : <Text style={styles.uploadInfo}>No screenshot selected yet.</Text>}
                  {stepValidation.paymentProof ? <Text style={styles.helperError}>{stepValidation.paymentProof}</Text> : null}
                </View>
              )}
            </View>
          )}
          {step === "review" && (
            <View style={styles.card}>
              <Text style={styles.title}>Review Booking</Text>
              <Text style={styles.hint}>Double-check details before submit.</Text>

              <View style={styles.reviewCard}>
                <View style={styles.reviewRow}>
                  <Ionicons name="navigate-outline" size={15} color="#8FC8FF" />
                  <Text style={styles.reviewLabel}>Route</Text>
                  <Text style={styles.reviewValue} numberOfLines={1}>{selectedSchedule?.origin ?? selectedFrom} {" -> "} {selectedSchedule?.destination ?? selectedTo}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Ionicons name="time-outline" size={15} color="#8FC8FF" />
                  <Text style={styles.reviewLabel}>Departure</Text>
                  <Text style={styles.reviewValue} numberOfLines={1}>
                    {toLongDate(selectedSchedule?.departureDatetime ?? selectedSchedule?.departure)} {toTimeText(selectedSchedule?.departureDatetime ?? selectedSchedule?.departure)}
                  </Text>
                </View>
                {serviceType === "cargo" ? (
                  <>
                    <View style={styles.reviewRow}>
                      <Ionicons name="person-outline" size={15} color="#8FC8FF" />
                      <Text style={styles.reviewLabel}>Sender</Text>
                      <Text style={styles.reviewValue} numberOfLines={1}>{fullNameFromProfile(profile, session?.username)}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Ionicons name="call-outline" size={15} color="#8FC8FF" />
                      <Text style={styles.reviewLabel}>Receiver</Text>
                      <Text style={styles.reviewValue} numberOfLines={1}>{receiverName} • {receiverPhone}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Ionicons name="cube-outline" size={15} color="#8FC8FF" />
                      <Text style={styles.reviewLabel}>Cargo</Text>
                      <Text style={styles.reviewValue} numberOfLines={2}>{cargoDescription}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Ionicons name="speedometer-outline" size={15} color="#8FC8FF" />
                      <Text style={styles.reviewLabel}>Weight</Text>
                      <Text style={styles.reviewValue}>{cargoWeight} kg</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.reviewRow}>
                      <Ionicons name="person-outline" size={15} color="#8FC8FF" />
                      <Text style={styles.reviewLabel}>Passenger</Text>
                      <Text style={styles.reviewValue} numberOfLines={1}>{fullNameFromProfile(profile, session?.username)}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Ionicons name="people-outline" size={15} color="#8FC8FF" />
                      <Text style={styles.reviewLabel}>Passengers</Text>
                      <Text style={styles.reviewValue}>{passengerCount} (Senior {seniorCount}, PWD {pwdCount})</Text>
                    </View>
                  </>
                )}
                <View style={styles.reviewRow}>
                  <Ionicons name="wallet-outline" size={15} color="#8FC8FF" />
                  <Text style={styles.reviewLabel}>Payment</Text>
                  <Text style={styles.reviewValue}>{paymentMethod === "gcash" ? `GCash ${paymentReference}` : "Cash collection"}</Text>
                </View>
              </View>

              <View style={styles.reviewTotalCard}>
                <Text style={styles.total}>Total: {formatPeso(serviceType === "cargo" ? cargoTotal : totalAmount)}</Text>
              </View>
            </View>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            {step !== "schedule" && <Pressable style={styles.back} disabled={isSubmitting} onPress={() => { if (step === "passengers") setStep("schedule"); else if (step === "payment") setStep("passengers"); else setStep("payment"); }}><Text style={styles.backText}>Back</Text></Pressable>}
            {step !== "review" ? (
              <Pressable style={[styles.next, (!currentStepValid || isSubmitting) && styles.nextMuted]} disabled={isSubmitting || !currentStepValid} onPress={nextStep}>
                <Text style={styles.nextText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.next, isSubmitting && styles.nextMuted]} disabled={isSubmitting} onPress={() => void submitBooking()}>
                {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.nextText}>Submit Booking</Text>}
              </Pressable>
            )}
          </View>
          {step !== "review" && firstStepValidationMessage ? <Text style={styles.actionHint}>{firstStepValidationMessage}</Text> : null}
        </ScrollView>
      )}

      <AppDialog visible={dialogVisible} kind={dialogKind} title={dialogTitle} message={dialogMessage} onClose={closeDialog} />

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <Pressable style={styles.calendarOverlay} onPress={() => setShowCalendar(false)}>
          <Pressable style={styles.calendarModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarHeaderTitle}>Select Date</Text>
              <Pressable style={styles.calendarCloseBtn} onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={16} color="#DCEEFF" />
              </Pressable>
            </View>
            <View style={styles.month}>
              <Pressable style={styles.monthBtn} onPress={() => setVisibleMonth((d) => addMonths(d, -1))}>
                <Ionicons name="chevron-back" size={14} color="#CAE0F5" />
              </Pressable>
              <Text style={styles.monthText}>{visibleMonth.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</Text>
              <Pressable style={styles.monthBtn} onPress={() => setVisibleMonth((d) => addMonths(d, 1))}>
                <Ionicons name="chevron-forward" size={14} color="#CAE0F5" />
              </Pressable>
            </View>
            <View style={styles.grid}>
              {monthDays.map((d) => {
                const active = selectedDate === d.key;
                const disabled = !d.inMonth || d.count === 0;
                return (
                  <Pressable
                    key={d.key}
                    disabled={disabled}
                    onPress={() => {
                      setSelectedDate(d.key);
                      setShowCalendar(false);
                    }}
                    style={[styles.day, active && styles.dayActive, disabled && styles.dayDisabled]}
                  >
                    <Text style={[styles.dayN, active && styles.dayNActive]}>{d.day}</Text>
                    <Text style={[styles.dayC, active && styles.dayCActive]}>{d.count > 0 ? `${d.count}x` : "-"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071A2D" },
  head: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginBottom: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#103454", alignItems: "center", justifyContent: "center" },
  iconBtnMuted: { opacity: 0.6 },
  headTitle: { color: "#E8F2FB", fontSize: 16, fontWeight: "800" },
  steps: { flexDirection: "row", gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  step: { flex: 1, borderRadius: 999, paddingVertical: 7, backgroundColor: "#0D2C47", borderWidth: 1, borderColor: "#204666", alignItems: "center" },
  stepActive: { backgroundColor: "#1B4D74", borderColor: "#6AB6FF" },
  stepText: { color: "#97B6D3", fontSize: 11, fontWeight: "700" },
  stepTextActive: { color: "#EAF4FF" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  scroll: { flex: 1, paddingHorizontal: 14 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: "#224D73", backgroundColor: "#0B2741", padding: 14, marginBottom: 10 },
  title: { color: "#F1F8FF", fontSize: 18, fontWeight: "800" },
  hint: { color: "#A7C0D9", fontSize: 13, marginTop: 4 },
  filterLabel: { color: "#BFD6EC", fontSize: 12, fontWeight: "700" },
  filterBar: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: "#305C80", backgroundColor: "#0F3150", paddingHorizontal: 10, height: 44, alignItems: "center", flexDirection: "row", gap: 8 },
  fieldShellError: { borderColor: "#B94C63", backgroundColor: "#14293A" },
  filterInput: { flex: 1, color: "#F1F8FF", fontSize: 14, paddingVertical: 0 },
  row: { gap: 8, paddingTop: 8 },
  filterActions: { marginTop: 10, flexDirection: "row", gap: 8 },
  searchBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: "#2F78E0", alignItems: "center", justifyContent: "center" },
  searchBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  clearBtn: { width: 82, height: 40, borderRadius: 12, borderWidth: 1, borderColor: "#3C6687", backgroundColor: "#0E2C48", alignItems: "center", justifyContent: "center" },
  clearBtnText: { color: "#D7E8F8", fontSize: 13, fontWeight: "700" },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: "#295778", backgroundColor: "#0E2D4A", paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { borderColor: "#5DB0FF", backgroundColor: "#19507A" },
  chipText: { color: "#C6DCF1", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#F4FAFF" },
  mt: { marginTop: 12 },
  oneWayHeader: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  oneWayTitle: { color: "#D7E7F7", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  oneWayActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  smallDateBtn: { height: 28, borderRadius: 999, paddingHorizontal: 10, borderWidth: 1, borderColor: "#2F5B7D", backgroundColor: "#0F3150", flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center" },
  smallDateBtnText: { color: "#D7E9FB", fontSize: 11, fontWeight: "700" },
  quickDateRow: { paddingTop: 8, gap: 8 },
  quickDateCard: { minWidth: 118, borderRadius: 12, borderWidth: 1, borderColor: "#2A5578", backgroundColor: "#0D2E4A", paddingVertical: 8, paddingHorizontal: 10 },
  quickDateCardActive: { borderColor: "#63B3FF", backgroundColor: "#1C5582" },
  quickDateTop: { color: "#EAF6FF", fontSize: 12, fontWeight: "700" },
  quickDateTopActive: { color: "#FFFFFF" },
  quickDateBottom: { marginTop: 2, color: "#9EC0DC", fontSize: 11, fontWeight: "600" },
  quickDateBottomActive: { color: "#DAEFFF" },
  month: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#10314F", alignItems: "center", justifyContent: "center" },
  monthText: { color: "#E8F3FF", fontSize: 14, fontWeight: "700" },
  grid: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  day: { width: "13.5%", minWidth: 42, borderRadius: 10, borderWidth: 1, borderColor: "#244D6F", backgroundColor: "#0C2A45", paddingVertical: 5, alignItems: "center" },
  dayActive: { backgroundColor: "#1C5582", borderColor: "#73C2FF" },
  dayDisabled: { opacity: 0.45 },
  dayN: { color: "#D8E7F6", fontSize: 12, fontWeight: "700" },
  dayNActive: { color: "#FFFFFF" },
  dayC: { marginTop: 2, color: "#88A7C3", fontSize: 9, fontWeight: "600" },
  dayCActive: { color: "#EAF6FF" },
  availabilityGuide: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  guideLabel: { color: "#A7C0D9", fontSize: 11, fontWeight: "700" },
  guideBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#0E2D4A" },
  guideBadgeText: { fontSize: 10, fontWeight: "800" },
  metaInfo: { marginTop: 8, color: "#9FBBD4", fontSize: 12, fontWeight: "600" },
  schedule: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: "#255173", backgroundColor: "#0D2E4A", padding: 11 },
  scheduleActive: { borderColor: "#6AB8FF", backgroundColor: "#184B74" },
  scheduleDisabled: { opacity: 0.5, borderColor: "#3A4F63", backgroundColor: "#172736" },
  scheduleTitle: { color: "#EAF6FF", fontSize: 1, lineHeight: 1, height: 0, opacity: 0 },
  scheduleHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scheduleTitleMain: { flex: 1, color: "#EAF6FF", fontSize: 14, fontWeight: "800" },
  statusBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeScheduled: { borderColor: "#3B9CF4", backgroundColor: "#134A77" },
  statusBadgeEnded: { borderColor: "#9A5262", backgroundColor: "#4A2530" },
  statusBadgeOther: { borderColor: "#5A78A0", backgroundColor: "#17344F" },
  statusBadgeText: { color: "#EAF6FF", fontSize: 10, fontWeight: "800" },
  scheduleGrid: { marginTop: 7, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scheduleCell: { width: "48%", borderRadius: 10, borderWidth: 1, borderColor: "#2B5375", backgroundColor: "rgba(18,58,89,0.45)", paddingHorizontal: 8, paddingVertical: 6 },
  scheduleCellLabel: { color: "#92B1CF", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  scheduleCellValue: { marginTop: 2, color: "#EAF6FF", fontSize: 12, fontWeight: "700" },
  scheduleCountdown: { marginTop: 7, color: "#86D7FF", fontSize: 11, fontWeight: "800" },
  scheduleMeta: { marginTop: 4, color: "#BDD2E6", fontSize: 12 },
  tapToChoose: { marginTop: 6, color: "#8FC8FF", fontSize: 11, fontWeight: "700" },
  tapBlocked: { marginTop: 6, color: "#FFB2B2", fontSize: 11, fontWeight: "700" },
  sectionTitle: { marginTop: 14, color: "#EAF6FF", fontSize: 14, fontWeight: "800" },
  tripStatRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  tripStatCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#264E71",
    backgroundColor: "#0D2E4A",
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 74,
  },
  tripStatFullCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#264E71",
    backgroundColor: "#0D2E4A",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tripStatTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  tripStatLabel: { color: "#8FAFD0", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  tripStatValue: { marginTop: 6, color: "#EAF6FF", fontSize: 13, fontWeight: "800" },
  tripStatSub: { marginTop: 2, color: "#9FC0DE", fontSize: 11, fontWeight: "600" },
  fareRuleCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#305C80",
    backgroundColor: "#0F3150",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  fareRuleValue: { marginTop: 6, color: "#F2F9FF", fontSize: 16, fontWeight: "900" },
  fareRuleHint: { marginTop: 4, color: "#A7C0D9", fontSize: 12 },
  fareBreakdownCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C557A",
    backgroundColor: "#0B2943",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  discountCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C557A",
    backgroundColor: "#0B2943",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  discountHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  discountTitle: { color: "#EAF6FF", fontSize: 13, fontWeight: "800" },
  discountBadge: { borderRadius: 10, borderWidth: 1, borderColor: "#3D8D6A", backgroundColor: "#123E31", paddingHorizontal: 8, paddingVertical: 3 },
  discountBadgeText: { color: "#8EF5C4", fontSize: 10, fontWeight: "800" },
  idsWrap: { marginTop: 8, gap: 6 },
  idGroupTitle: { color: "#9FC0DE", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  counterRow: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: "#264E70", backgroundColor: "#0D2E4A", padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counterLabel: { color: "#EAF4FF", fontSize: 13, fontWeight: "700", maxWidth: "52%" },
  counterBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterBtn: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: "#39719B", backgroundColor: "#143A59", alignItems: "center", justifyContent: "center" },
  counterValue: { minWidth: 24, textAlign: "center", color: "#F4FAFF", fontSize: 16, fontWeight: "800" },
  total: { marginTop: 8, color: "#EAF6FF", fontSize: 17, fontWeight: "800" },
  payRow: { marginTop: 10, gap: 10 },
  pay: { borderRadius: 14, borderWidth: 1, borderColor: "#2A5578", backgroundColor: "#0D2E4A", padding: 11 },
  payActive: { borderColor: "#6AB8FF", backgroundColor: "#194F78" },
  payTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  payTitle: { color: "#F2F9FF", fontSize: 14, fontWeight: "800" },
  payHint: { marginTop: 2, color: "#B7D0E6", fontSize: 12 },
  paymentDetailCard: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: "#2C557A", backgroundColor: "#0B2943", padding: 10 },
  inputLabel: { color: "#BFD6EC", fontSize: 12, fontWeight: "700" },
  input: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: "#305C80", backgroundColor: "#0F3150", color: "#F1F8FF", fontSize: 14, paddingHorizontal: 11, paddingVertical: 9 },
  inputError: { borderColor: "#B94C63", backgroundColor: "#14293A" },
  uploadBtn: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: "#3F6D91", backgroundColor: "#123654", height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadBtnText: { color: "#EAF6FF", fontSize: 13, fontWeight: "700" },
  uploadInfo: { marginTop: 6, color: "#AFC7DE", fontSize: 12 },
  reviewCard: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: "#2C557A", backgroundColor: "#0B2943", paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  reviewLabel: { color: "#95B5D3", fontSize: 11, fontWeight: "700", width: 68, textTransform: "uppercase", letterSpacing: 0.3 },
  reviewValue: { flex: 1, color: "#EAF6FF", fontSize: 13, fontWeight: "700" },
  reviewTotalCard: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: "#3A6790", backgroundColor: "#123754", paddingHorizontal: 12, paddingVertical: 10 },
  calendarOverlay: { flex: 1, backgroundColor: "rgba(2, 14, 26, 0.66)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  calendarModal: { width: "100%", maxWidth: 430, borderRadius: 16, borderWidth: 1, borderColor: "#2E5A7D", backgroundColor: "#0A253D", padding: 12, alignSelf: "center" },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  calendarHeaderTitle: { color: "#F1F8FF", fontSize: 15, fontWeight: "800" },
  calendarCloseBtn: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, borderColor: "#31597A", backgroundColor: "#133754", alignItems: "center", justifyContent: "center" },
  error: { marginTop: 4, marginBottom: 6, color: "#FF9B9B", fontSize: 12, fontWeight: "700" },
  helperError: { marginTop: 6, color: "#FF9DB0", fontSize: 11, lineHeight: 15, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, marginBottom: 10 },
  actionHint: { marginTop: -2, marginBottom: 12, color: "#FFB8C4", fontSize: 11, fontWeight: "700", textAlign: "center" },
  back: { width: 110, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#3C6687", backgroundColor: "#0E2C48" },
  backText: { color: "#D7E8F8", fontSize: 14, fontWeight: "700" },
  next: { flex: 1, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#3A86E8" },
  nextMuted: { backgroundColor: "#33577A" },
  nextText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
