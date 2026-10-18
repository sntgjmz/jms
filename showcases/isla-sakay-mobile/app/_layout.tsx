import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

enableScreens(false);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.background}>
      <View style={styles.phone}>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <DemoBar />
            <Stack screenOptions={{ headerShown: false, animation: "none" }} />
          </AuthProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}

function DemoBar() {
  const { session, setSession } = useAuth();
  const router = useRouter();

  async function switchRole() {
    await setSession(null);
    router.replace("/login");
  }

  function resetDemo() {
    const role = session?.principalType === "BOAT_OPERATOR" ? "operator" : session ? "passenger" : "";
    navigateTop(`./index.html${role ? `?role=${role}` : ""}`);
  }

  return (
    <View style={styles.banner}>
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerTitle}>MOBILE FRONTEND DEMO</Text>
        <Text style={styles.bannerHint}>Fictional data & weather · resets on reload</Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={switchRole} style={styles.action}><Text style={styles.actionText}>Roles</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={resetDemo} style={styles.action}><Text style={styles.actionText}>Reset</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => navigateTop("/#work")} style={styles.action}><Text style={styles.actionText}>Portfolio ↗</Text></Pressable>
      </View>
    </View>
  );
}

function navigateTop(url: string) {
  if (typeof window === "undefined") return;
  // The exported app sits in a same-origin frame so its browser URL stays reloadable.
  const target = new URL(url.startsWith("/#") ? `../..${url}` : url, window.location.href);
  (window.parent !== window ? window.parent : window).location.assign(target.href);
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#102736", alignItems: "center" },
  phone: { flex: 1, width: "100%", maxWidth: 480, backgroundColor: "#E9EFF9", overflow: "hidden" },
  banner: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#08283E", gap: 6 },
  bannerCopy: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 3 },
  bannerTitle: { color: "#F0C988", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  bannerHint: { color: "#CEE1EE", fontSize: 9 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  action: { paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: "#426075", borderRadius: 6 },
  actionText: { color: "#F4F8FB", fontSize: 11, fontWeight: "600" },
});
