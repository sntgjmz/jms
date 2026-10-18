import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useAuth } from "@/contexts/AuthContext";
import AppDialog from "@/components/ui/AppDialog";
import { ApiError, getAppUserById, type AppUserProfile } from "@/services/api";
import { fetchLiveWeather, resolveWeatherIconName } from "@/services/weather";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(340, SCREEN_WIDTH * 0.84);

type DrawerAction = "activity-log" | "history" | "notification" | "support" | "about" | "payment" | "profile" | "logout";

type DrawerItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: DrawerAction;
};

const DRAWER_ITEMS: DrawerItem[] = [
  { icon: "receipt-outline", label: "Activity Log", action: "activity-log" },
  { icon: "time-outline", label: "History", action: "history" },
  { icon: "notifications-outline", label: "Notification", action: "notification" },
  { icon: "chatbubble-ellipses-outline", label: "Support / Feedback", action: "support" },
  { icon: "information-circle-outline", label: "About Us", action: "about" },
  { icon: "card-outline", label: "Payment", action: "payment" },
  { icon: "log-out-outline", label: "Logout", action: "logout" },
];

export default function UserHomeScreen() {
  const router = useRouter();
  const { session, setSession } = useAuth();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [activeDrawerAction, setActiveDrawerAction] = useState<DrawerAction | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [weatherCelsius, setWeatherCelsius] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const drawerTranslateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const serviceTranslateY = useRef(new Animated.Value(320)).current;

  const mapScale = useSharedValue(1.12);
  const mapTranslateX = useSharedValue(0);
  const mapTranslateY = useSharedValue(0);
  const baseScale = useSharedValue(1.12);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const mapWidth = useSharedValue(SCREEN_WIDTH);
  const mapHeight = useSharedValue(340);

  useEffect(() => {
    async function loadProfile() {
      if (!session || session.principalType !== "USER") return;
      setScreenError(null);
      try {
        const payload = await getAppUserById(session.principalId, session.accessToken);
        setProfile(payload);
      } catch (error) {
        if (error instanceof ApiError) {
          setScreenError(`Profile failed to load (${error.status}).`);
        } else {
          setScreenError("Unable to load your profile.");
        }
      }
    }
    void loadProfile();
  }, [session]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadWeather = async () => {
      try {
        const payload = await fetchLiveWeather();
        if (!active) return;
        setWeatherCelsius(payload.temperatureCelsius);
        setWeatherCode(payload.weatherCode);
      } catch {
        // Keep previous reading on transient network errors.
      }
    };

    void loadWeather();
    timer = setInterval(() => {
      void loadWeather();
    }, 1000 * 60 * 10);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const displayName = useMemo(() => {
    if (profile?.firstName?.trim() || profile?.lastName?.trim()) {
      return `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
    }
    if (profile?.nickname?.trim()) return profile.nickname;
    if (session?.username?.trim()) return session.username;
    return "Passenger";
  }, [profile?.firstName, profile?.lastName, profile?.nickname, session?.username]);

  const weatherFahrenheit = weatherCelsius == null ? null : (weatherCelsius * 9) / 5 + 32;

  const weatherIconName = useMemo<keyof typeof Ionicons.glyphMap>(() => resolveWeatherIconName(weatherCode), [weatherCode]);

  function showDialog(title: string, message: string) {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  }

  const clampPosition = (scale: number, x: number, y: number) => {
    "worklet";
    const maxX = ((scale - 1) * mapWidth.value) / 2;
    const maxY = ((scale - 1) * mapHeight.value) / 2;
    const nextX = Math.max(Math.min(x, maxX), -maxX);
    const nextY = Math.max(Math.min(y, maxY), -maxY);
    return { x: nextX, y: nextY };
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const rawScale = baseScale.value * event.scale;
      const nextScale = Math.max(1.04, Math.min(rawScale, 2.4));
      mapScale.value = nextScale;
      const clamped = clampPosition(nextScale, mapTranslateX.value, mapTranslateY.value);
      mapTranslateX.value = clamped.x;
      mapTranslateY.value = clamped.y;
    })
    .onEnd(() => {
      baseScale.value = mapScale.value;
      const clamped = clampPosition(mapScale.value, mapTranslateX.value, mapTranslateY.value);
      mapTranslateX.value = withTiming(clamped.x, { duration: 140 });
      mapTranslateY.value = withTiming(clamped.y, { duration: 140 });
      baseTranslateX.value = clamped.x;
      baseTranslateY.value = clamped.y;
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      const targetX = baseTranslateX.value + event.translationX;
      const targetY = baseTranslateY.value + event.translationY;
      const clamped = clampPosition(mapScale.value, targetX, targetY);
      mapTranslateX.value = clamped.x;
      mapTranslateY.value = clamped.y;
    })
    .onEnd(() => {
      baseTranslateX.value = mapTranslateX.value;
      baseTranslateY.value = mapTranslateY.value;
    });

  const mapGesture = Gesture.Simultaneous(pinch, pan);

  const mapAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: mapTranslateX.value },
      { translateY: mapTranslateY.value },
      { scale: mapScale.value },
    ],
  }));

  function openDrawer() {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 190, useNativeDriver: true }),
      Animated.timing(drawerTranslateX, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(drawerTranslateX, { toValue: DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  }

  function openServicePicker() {
    setServicePickerVisible(true);
    Animated.timing(serviceTranslateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  function closeServicePicker() {
    Animated.timing(serviceTranslateY, {
      toValue: 320,
      duration: 190,
      useNativeDriver: true,
    }).start(() => setServicePickerVisible(false));
  }

  async function signOut() {
    await setSession(null);
    router.replace("/login");
  }

  function onDrawerAction(action: DrawerAction) {
    setActiveDrawerAction(action);
    if (action === "activity-log") {
      closeDrawer();
      router.push("/user/activity-log");
      return;
    }
    if (action === "history") {
      closeDrawer();
      router.push("/user/history");
      return;
    }
    if (action === "profile") {
      closeDrawer();
      router.push("/user/profile");
      return;
    }
    if (action === "notification") {
      closeDrawer();
      router.push("/user/notifications");
      return;
    }
    if (action === "support") {
      closeDrawer();
      router.push("/user/support" as never);
      return;
    }
    if (action === "payment") {
      closeDrawer();
      router.push("/user/payments" as never);
      return;
    }
    if (action === "about") {
      closeDrawer();
      router.push("/user/about" as never);
      return;
    }
    if (action === "logout") {
      closeDrawer();
      void signOut();
      return;
    }
    showDialog("Coming soon", `We'll wire ${action} next.`);
  }

  function chooseService(type: "motor" | "cargo") {
    closeServicePicker();
    router.push(`/user/booking?service=${type}`);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(6, insets.top * 0.08) }]}>
        <View style={styles.headerLeft}>
          <Image source={require("../../assets/images/isla-sakay-icon.png")} style={styles.headerLogo} contentFit="contain" />
          <View>
            <Text style={styles.headerTitle}>Isla Sakay</Text>
            <Text style={styles.headerSubtitle}>Island Adventures</Text>
          </View>
        </View>
        <Pressable style={styles.headerMenuBtn} onPress={openDrawer} android_ripple={{ color: "#DDEBFA" }}>
          <Ionicons name="menu" size={23} color="#143B63" />
        </Pressable>
      </View>

      <View
        style={styles.mapWrap}
        onLayout={(event) => {
          mapWidth.value = event.nativeEvent.layout.width;
          mapHeight.value = event.nativeEvent.layout.height;
        }}>
        <GestureDetector gesture={mapGesture}>
          <Reanimated.View style={[styles.mapGestureLayer, mapAnimatedStyle]}>
            <Image source={require("../../assets/images/maps.png")} style={styles.mapImage} contentFit="cover" />
          </Reanimated.View>
        </GestureDetector>

        <View style={styles.mapAttributionMask} />

        <View style={styles.weatherCard}>
          <Ionicons name={weatherIconName} size={18} color="#0D3157" />
          <View>
            <Text style={styles.weatherMain}>{weatherCelsius == null ? "--°C" : `${Math.round(weatherCelsius)}°C`}</Text>
            <Text style={styles.weatherSub}>{weatherFahrenheit == null ? "--°F" : `${Math.round(weatherFahrenheit)}°F`}</Text>
          </View>
        </View>

        <View style={styles.mapHintPill}>
          <Text style={styles.mapHintText}>Drag and pinch to explore</Text>
        </View>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(10, insets.bottom + 4) }]}>
        <Text style={styles.bottomTitle}>Choose Service</Text>
        <Pressable style={styles.bookButton} onPress={openServicePicker} android_ripple={{ color: "#7094B7" }}>
          <Text style={styles.bookButtonText}>BOOK</Text>
        </Pressable>
      </View>

      {servicePickerVisible ? (
        <>
          <Pressable style={styles.serviceBackdrop} onPress={closeServicePicker} />
          <Animated.View
            style={[
              styles.servicePicker,
              {
                paddingBottom: Math.max(16, insets.bottom + 10),
                transform: [{ translateY: serviceTranslateY }],
              },
            ]}>
            <View style={styles.serviceHeaderRow}>
              <Text style={styles.serviceHeaderTitle}>Magandang Araw Pasaheros</Text>
              <Pressable onPress={closeServicePicker} style={styles.serviceCloseBtn} android_ripple={{ color: "#D5E2F1" }}>
                <Ionicons name="close" size={22} color="#D7E8FA" />
              </Pressable>
            </View>
              <Text style={styles.serviceHint}>Select trip type</Text>

            <Pressable style={({ pressed }) => [styles.serviceCard, pressed && styles.serviceCardPressed]} onPress={() => chooseService("motor")} android_ripple={{ color: "#8BB7E8" }}>
              <View style={styles.serviceIconWrap}>
                <MaterialCommunityIcons name="ferry" size={28} color="#DCEEFF" />
              </View>
              <View style={styles.serviceTextWrap}>
                <Text style={styles.serviceCardText}>Boat</Text>
                <Text style={styles.serviceCardSub}>Passenger boat transport</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#B8D3EE" />
            </Pressable>

            <Pressable style={({ pressed }) => [styles.serviceCard, pressed && styles.serviceCardPressed]} onPress={() => chooseService("cargo")} android_ripple={{ color: "#8BB7E8" }}>
              <View style={styles.serviceIconWrap}>
                <MaterialCommunityIcons name="ferry" size={28} color="#DCEEFF" />
              </View>
              <View style={styles.serviceTextWrap}>
                <Text style={styles.serviceCardText}>Cargo</Text>
                <Text style={styles.serviceCardSub}>Cargo boat transport</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#B8D3EE" />
            </Pressable>
          </Animated.View>
        </>
      ) : null}

      {drawerVisible ? (
        <>
          <Animated.View style={[styles.drawerOverlay, { opacity: overlayOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawer,
              {
                paddingTop: Math.max(0, insets.top - 2),
                paddingBottom: Math.max(10, insets.bottom),
                transform: [{ translateX: drawerTranslateX }],
              },
            ]}>
            <View style={styles.drawerTop}>
              <Pressable onPress={closeDrawer} style={styles.drawerBackBtn} android_ripple={{ color: "rgba(255,255,255,0.2)" }}>
                <Ionicons name="arrow-back" size={22} color="#F2F7FD" />
              </Pressable>
              <Pressable style={styles.profileRow} onPress={() => onDrawerAction("profile")} android_ripple={{ color: "rgba(255,255,255,0.08)" }}>
                <View style={styles.avatarCircle}>
                  <FontAwesome name="user-o" size={30} color="#17395A" />
                </View>
                <View style={styles.profileTextWrap}>
                  <Text style={styles.drawerName}>{displayName}</Text>
                  <Text style={styles.drawerSub}>View profile</Text>
                </View>
                <Ionicons name="chevron-forward-circle" size={27} color="#EAF3FF" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.drawerList}>
              {DRAWER_ITEMS.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    activeDrawerAction === item.action && styles.drawerItemActive,
                    pressed && styles.drawerItemPressed,
                  ]}
                  onPress={() => onDrawerAction(item.action)}
                  android_ripple={{ color: "#D6E6F7" }}>
                  <Ionicons name={item.icon} size={20} color={activeDrawerAction === item.action ? "#0F4F86" : "#244A70"} />
                  <Text style={[styles.drawerItemText, activeDrawerAction === item.action && styles.drawerItemTextActive]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={17} color="#8AA2BB" />
                </Pressable>
              ))}
              {screenError ? <Text style={styles.drawerError}>{screenError}</Text> : null}
            </ScrollView>
          </Animated.View>
        </>
      ) : null}

      <AppDialog
        visible={dialogVisible}
        kind="info"
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B3A5D",
  },
  header: {
    minHeight: 86,
    backgroundColor: "#0B3A5D",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 21,
    color: "#F6FBFF",
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11,
    lineHeight: 14,
    color: "#D6E7F7",
    fontWeight: "500",
  },
  headerMenuBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0F6FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mapWrap: {
    flex: 1,
    backgroundColor: "#071B2E",
    overflow: "hidden",
    marginTop: -3,
  },
  mapGestureLayer: {
    width: "100%",
    height: "100%",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapAttributionMask: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: 22,
    backgroundColor: "rgba(7, 27, 46, 0.98)",
  },
  weatherCard: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#F5F9FF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#061729",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  weatherMain: {
    fontSize: 15,
    lineHeight: 17,
    color: "#122F4C",
    fontWeight: "800",
  },
  weatherSub: {
    fontSize: 12,
    lineHeight: 14,
    color: "#304F6D",
  },
  mapHintPill: {
    position: "absolute",
    right: 12,
    bottom: 26,
    borderRadius: 14,
    backgroundColor: "rgba(4, 23, 40, 0.74)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mapHintText: {
    color: "#DDEBFA",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  bottomPanel: {
    backgroundColor: "#0D3B61",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#2A5578",
  },
  bottomTitle: {
    color: "#F6FBFF",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  bottomSub: {
    color: "#CFE1F3",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "500",
  },
  bookButton: {
    marginTop: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#6C8CAC",
    backgroundColor: "#355A7C",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bookButtonText: {
    color: "#F7FBFF",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  serviceBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 12, 22, 0.4)",
  },
  servicePicker: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0B2F4D",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 12,
    minHeight: 300,
    borderTopWidth: 1,
    borderTopColor: "#2E5982",
    shadowColor: "#00111F",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  serviceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceHeaderTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: "#F0F7FF",
    fontWeight: "800",
  },
  serviceCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(202,225,248,0.12)",
    overflow: "hidden",
  },
  serviceHint: {
    borderTopWidth: 1,
    borderTopColor: "#2C557B",
    paddingTop: 12,
    fontSize: 13,
    lineHeight: 16,
    color: "#BFD5EA",
    fontWeight: "500",
  },
  serviceCard: {
    borderRadius: 20,
    backgroundColor: "#17456D",
    minHeight: 86,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#2E6694",
    overflow: "hidden",
  },
  serviceCardPressed: {
    opacity: 0.9,
  },
  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F3659",
    borderWidth: 1,
    borderColor: "#285C86",
  },
  serviceTextWrap: {
    flex: 1,
    gap: 1,
  },
  serviceCardText: {
    color: "#F1F8FF",
    fontSize: 20,
    lineHeight: 23,
    fontWeight: "700",
  },
  serviceCardSub: {
    color: "#B8D3EA",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "500",
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 18, 30, 0.56)",
    zIndex: 24,
    elevation: 24,
  },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "#DCE6F2",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    overflow: "hidden",
    zIndex: 30,
    elevation: 30,
  },
  drawerTop: {
    backgroundColor: "#0D3C60",
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 14,
    gap: 12,
  },
  drawerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F0F6FD",
    alignItems: "center",
    justifyContent: "center",
  },
  profileTextWrap: {
    flex: 1,
  },
  drawerName: {
    color: "#F7FBFF",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
  },
  drawerSub: {
    color: "#D2E5F7",
    fontSize: 13,
    lineHeight: 16,
  },
  drawerList: {
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  drawerItem: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#EAF2FB",
    borderWidth: 1,
    borderColor: "#D5E2F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#94AEC8",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  drawerItemPressed: {
    opacity: 0.86,
  },
  drawerItemActive: {
    borderColor: "#8CB8E6",
    backgroundColor: "#DCECFD",
  },
  drawerItemText: {
    flex: 1,
    color: "#1E3B58",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
  drawerItemTextActive: {
    color: "#0F4F86",
  },
  drawerError: {
    color: "#B20F2A",
    fontSize: 12,
    lineHeight: 16,
  },
});
