import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

const TITLE = "ISLA SAKAY";

export default function SplashScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const palette = isDark
    ? {
        screen: "#08131F",
        orbA: "#14304D",
        orbB: "#0E2237",
        wrap: "#0D1C2D",
        wrapBorder: "#1B3858",
        title: "#F4F8FC",
        subtitle: "#97AECB",
        cursor: "#FFBE55",
      }
    : {
        screen: "#E9EFF9",
        orbA: "#D5E6FB",
        orbB: "#DDEBFA",
        wrap: "#F8FBFF",
        wrapBorder: "#D1DDF0",
        title: "#113C6D",
        subtitle: "#4A6386",
        cursor: "#FFB649",
      };

  useEffect(() => {
    if (index >= TITLE.length) {
      const doneTimer = setTimeout(() => {
        router.replace("/login");
      }, 700);
      return () => clearTimeout(doneTimer);
    }

    const timer = setTimeout(() => {
      setIndex((prev) => prev + 1);
    }, 120);

    return () => clearTimeout(timer);
  }, [index, router]);

  const typedText = useMemo(() => TITLE.slice(0, index), [index]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.screen }]}>
      <View style={[styles.orbTop, { backgroundColor: palette.orbA }]} />
      <View style={[styles.orbBottom, { backgroundColor: palette.orbB }]} />
      <View style={styles.center}>
        <View style={[styles.logoWrap, { backgroundColor: palette.wrap, borderColor: palette.wrapBorder }]}>
          <Image source={require("../assets/images/isla-sakay-login.png")} style={styles.logo} contentFit="contain" />
        </View>
        <Text style={[styles.title, { color: palette.title }]}>
          {typedText}
          <Text style={[styles.cursor, { color: palette.cursor }]}>|</Text>
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.subtitle, { color: palette.subtitle }]}>Boat Booking</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E9EFF9",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  orbTop: {
    position: "absolute",
    top: -120,
    right: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.55,
  },
  orbBottom: {
    position: "absolute",
    bottom: -120,
    left: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
    opacity: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  logoWrap: {
    width: 170,
    height: 170,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logo: {
    width: 138,
    height: 138,
  },
  title: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "800",
    letterSpacing: 1.4,
    minHeight: 35,
  },
  cursor: {
    fontWeight: "700",
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
