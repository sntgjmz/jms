import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, getMyNotifications, markAllNotificationsRead, markNotificationRead, type SystemNotification } from "@/services/api";

type DialogKind = "info" | "error" | "success";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SystemNotification[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

  const isUserAlert = (note: SystemNotification) => {
    if (!note.userId) return false;
    const type = (note.type ?? "").toLowerCase();
    return type.includes("payment") || type.includes("trip_status");
  };

  const isGlobalAlert = (note: SystemNotification) => {
    if (note.userId) return false;
    const type = (note.type ?? "").toLowerCase();
    if (!type) return true;
    return type.includes("alert") || type.includes("weather") || type.includes("calamity") || type.includes("coast_guard");
  };

  const bookingUpdates = useMemo(() => items.filter(isUserAlert), [items]);
  const globalAlerts = useMemo(() => items.filter(isGlobalAlert), [items]);

  function notificationMeta(note: SystemNotification) {
    const type = (note.type ?? "").toLowerCase();
    if (type.includes("payment")) {
      return {
        icon: "card-outline" as const,
        title: "Payment update",
        iconStyle: styles.itemIconPayment,
      };
    }
    if (type.includes("trip_status")) {
      return {
        icon: "boat-outline" as const,
        title: "Trip status",
        iconStyle: styles.itemIconTrip,
      };
    }
    return {
      icon: "notifications-outline" as const,
      title: "Booking update",
      iconStyle: styles.itemIcon,
    };
  }

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!session?.accessToken) return;
      setLoading(true);
      try {
        const payload = await getMyNotifications(session.accessToken);
        if (!active) return;
        setItems(payload);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          setDialogKind("error");
          setDialogTitle("Unable to load");
          setDialogMessage(`Could not load notifications (${err.status}).`);
          setDialogVisible(true);
        } else {
          setDialogKind("error");
          setDialogTitle("Unable to load");
          setDialogMessage("Could not load notifications.");
          setDialogVisible(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [session?.accessToken]);

  async function onMarkAll() {
    if (!session?.accessToken) return;
    try {
      await markAllNotificationsRead(session.accessToken);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setDialogKind("success");
      setDialogTitle("All read");
      setDialogMessage("All notifications have been marked as read.");
      setDialogVisible(true);
    } catch (err) {
      setDialogKind("error");
      setDialogTitle("Failed");
      setDialogMessage("Could not mark all as read.");
      setDialogVisible(true);
    }
  }

  async function onMarkOne(id: string) {
    if (!session?.accessToken) return;
    try {
      await markNotificationRead(session.accessToken, id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      setDialogKind("error");
      setDialogTitle("Failed");
      setDialogMessage("Could not mark this notification as read.");
      setDialogVisible(true);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top * 0.35) }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF6FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable style={styles.markAllBtn} onPress={() => void onMarkAll()}>
          <Ionicons name="checkmark-done" size={16} color="#DCEEFF" />
          <Text style={styles.markAllText}>Read all</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#9ED2FF" />
            <Text style={styles.loadingText}>Loading alerts…</Text>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No alerts yet.</Text>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>My Payments & Trip Status</Text>
              <Text style={styles.sectionCount}>{bookingUpdates.length}</Text>
            </View>
            {bookingUpdates.length === 0 ? (
              <Text style={styles.emptyText}>No booking or payment updates yet.</Text>
            ) : (
              bookingUpdates.map((note) => {
                const meta = notificationMeta(note);
                return (
                <Pressable key={note.id} style={[styles.item, note.isRead && styles.itemRead]} onPress={() => void onMarkOne(note.id)}>
                  <View style={[styles.itemIcon, meta.iconStyle]}>
                    <Ionicons name={note.isRead ? meta.icon : "notifications"} size={18} color="#EAF6FF" />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemMeta}>{meta.title}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>{note.title}</Text>
                    <Text style={styles.itemMessage} numberOfLines={2}>{note.message}</Text>
                  </View>
                  {!note.isRead && <View style={styles.unreadDot} />}
                </Pressable>
                );
              })
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Alerts</Text>
              <Text style={styles.sectionCount}>{globalAlerts.length}</Text>
            </View>
            {globalAlerts.length === 0 ? (
              <Text style={styles.emptyText}>No global alerts right now.</Text>
            ) : (
              globalAlerts.map((note) => (
                <Pressable key={note.id} style={[styles.item, note.isRead && styles.itemRead]} onPress={() => void onMarkOne(note.id)}>
                  <View style={[styles.itemIcon, styles.itemIconAlert]}>
                    <Ionicons name="alert-circle" size={18} color="#FFD6A7" />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemMeta}>Island-wide alert</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>{note.title}</Text>
                    <Text style={styles.itemMessage} numberOfLines={2}>{note.message}</Text>
                  </View>
                  {!note.isRead && <View style={styles.unreadDot} />}
                </Pressable>
              ))
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
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2C557A",
    backgroundColor: "#0B2741",
  },
  markAllText: { color: "#DCEEFF", fontSize: 11, fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  sectionHeader: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    color: "#A7C0D9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionCount: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#10314F",
    color: "#D8ECFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#214B6D",
    backgroundColor: "#0F2F4C",
    padding: 12,
  },
  itemRead: { opacity: 0.7 },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#123654",
  },
  itemIconPayment: {
    backgroundColor: "#133C38",
    borderWidth: 1,
    borderColor: "#275B55",
  },
  itemIconTrip: {
    backgroundColor: "#143B58",
    borderWidth: 1,
    borderColor: "#2E6E9F",
  },
  itemIconAlert: {
    backgroundColor: "#3A2A1A",
    borderWidth: 1,
    borderColor: "#6B4B2A",
  },
  itemContent: { flex: 1, gap: 4 },
  itemMeta: { color: "#8EAFCC", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7 },
  itemTitle: { color: "#EAF6FF", fontSize: 13, fontWeight: "800" },
  itemMessage: { color: "#BBD3EA", fontSize: 12, lineHeight: 16 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#69B7FF",
    marginTop: 6,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 20 },
  loadingText: { color: "#A8C5DF", fontSize: 12 },
  emptyText: { color: "#A8C5DF", fontSize: 12, paddingVertical: 20 },
});
