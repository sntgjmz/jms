import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppDialog from "@/components/ui/AppDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, getMyNotifications, markAllNotificationsRead, markNotificationRead, type SystemNotification } from "@/services/api";

type DialogKind = "info" | "error" | "success";

export default function OperatorNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SystemNotification[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>("info");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");

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
          setDialogMessage(`Could not load operator notifications (${err.status}).`);
        } else {
          setDialogKind("error");
          setDialogTitle("Unable to load");
          setDialogMessage("Could not load operator notifications.");
        }
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

  const operationalUpdates = useMemo(
    () =>
      items.filter((note) => {
        if (!note.userId) return false;
        const type = (note.type ?? "").toLowerCase();
        return type.includes("booking")
          || type.includes("payment")
          || type.includes("trip_status")
          || type.includes("operator")
          || type.includes("schedule");
      }),
    [items],
  );

  const globalAlerts = useMemo(
    () =>
      items.filter((note) => {
        if (note.userId) return false;
        const type = (note.type ?? "").toLowerCase();
        return !type || type.includes("alert") || type.includes("weather") || type.includes("calamity") || type.includes("system");
      }),
    [items],
  );

  async function onMarkAll() {
    if (!session?.accessToken) return;
    try {
      await markAllNotificationsRead(session.accessToken);
      setItems((prev) => prev.map((note) => ({ ...note, isRead: true })));
      setDialogKind("success");
      setDialogTitle("All read");
      setDialogMessage("All operator notifications have been marked as read.");
      setDialogVisible(true);
    } catch {
      setDialogKind("error");
      setDialogTitle("Failed");
      setDialogMessage("Could not mark all operator notifications as read.");
      setDialogVisible(true);
    }
  }

  async function onMarkOne(id: string) {
    if (!session?.accessToken) return;
    try {
      await markNotificationRead(session.accessToken, id);
      setItems((prev) => prev.map((note) => (note.id === id ? { ...note, isRead: true } : note)));
    } catch {
      setDialogKind("error");
      setDialogTitle("Failed");
      setDialogMessage("Could not mark this operator notification as read.");
      setDialogVisible(true);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top * 0.35) }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF6FF" />
        </Pressable>
        <Text style={styles.headerTitle}>Operator Notifications</Text>
        <Pressable style={styles.markAllBtn} onPress={() => void onMarkAll()}>
          <Ionicons name="checkmark-done" size={16} color="#DCEEFF" />
          <Text style={styles.markAllText}>Read all</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#9ED2FF" />
            <Text style={styles.loadingText}>Loading operator alerts...</Text>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>No operator alerts yet.</Text>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Trip & Booking Updates</Text>
            {operationalUpdates.length === 0 ? (
              <Text style={styles.emptyText}>No trip or booking updates yet.</Text>
            ) : (
              operationalUpdates.map((note) => (
                <Pressable key={note.id} style={[styles.item, note.isRead && styles.itemRead]} onPress={() => void onMarkOne(note.id)}>
                  <View style={styles.itemIcon}>
                    <Ionicons name={note.isRead ? "notifications-outline" : "notifications"} size={18} color="#9ED2FF" />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{note.title}</Text>
                    <Text style={styles.itemMessage} numberOfLines={3}>{note.message}</Text>
                  </View>
                  {!note.isRead && <View style={styles.unreadDot} />}
                </Pressable>
              ))
            )}

            <Text style={styles.sectionLabel}>Global Alerts</Text>
            {globalAlerts.length === 0 ? (
              <Text style={styles.emptyText}>No global alerts right now.</Text>
            ) : (
              globalAlerts.map((note) => (
                <Pressable key={note.id} style={[styles.item, note.isRead && styles.itemRead]} onPress={() => void onMarkOne(note.id)}>
                  <View style={[styles.itemIcon, styles.itemIconAlert]}>
                    <Ionicons name="alert-circle" size={18} color="#FFD6A7" />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{note.title}</Text>
                    <Text style={styles.itemMessage} numberOfLines={3}>{note.message}</Text>
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
    gap: 8,
  },
  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#0D2E4A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#EAF6FF", fontSize: 17, fontWeight: "800", flex: 1, textAlign: "center" },
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
  sectionLabel: {
    marginTop: 6,
    color: "#A7C0D9",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
  itemIconAlert: {
    backgroundColor: "#3A2A1A",
    borderWidth: 1,
    borderColor: "#6B4B2A",
  },
  itemContent: { flex: 1, gap: 4 },
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
