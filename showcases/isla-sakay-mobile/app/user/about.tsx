import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const OBJECTIVES = [
  "To test the quality of the proposed system with at least 94% passing rate.",
  "To evaluate the user acceptability of the proposed system using ISO 25110 in terms of functionality, reliability, usability, efficiency, maintainability, portability, compatibility, and security.",
];

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { paddingTop: Math.max(6, insets.top * 0.08) }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#EAF4FF" />
        </Pressable>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(28, insets.bottom + 18) }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Isla Sakay</Text>
          <Text style={styles.heroSubtitle}>
            Web-Based Boat Schedule and Application Platform for Talim Island Commuters and Residents
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Specific Objectives</Text>
          <View style={styles.objectiveList}>
            {OBJECTIVES.map((objective, index) => (
              <View key={objective} style={styles.objectiveRow}>
                <View style={styles.objectiveBadge}>
                  <Text style={styles.objectiveBadgeText}>{index + 1}</Text>
                </View>
                <Text style={styles.objectiveText}>{objective}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Project Overview</Text>
          <Text style={styles.bodyText}>
            The project, Isla Sakay: Web-Based Boat Schedule and Application Platform for Talim Island
            Commuters and Residents, is designed to provide commuters and residents of Talim Island
            with an easier and more reliable way to access updated boat schedules.
          </Text>
          <Text style={styles.bodyText}>
            It involves two main users: boat operators or authorized personnel, who manage and update
            schedules through a web-based platform, and commuters or residents who use a mobile
            application to view available trips, departure times, boat names, and passenger capacity.
          </Text>
          <Text style={styles.bodyText}>
            This system is specifically intended for boat transportation to and from Talim Island and
            can be accessed anytime as long as there is an internet connection.
          </Text>
          <Text style={styles.bodyText}>
            It was developed because the current method of checking boat schedules is manual and often
            unreliable, causing missed trips, long waiting times, and inconvenience.
          </Text>
          <Text style={styles.bodyText}>
            The system works by allowing administrators to update trip details on the web platform,
            while users can view the latest information on the mobile application whenever needed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#071A2D",
  },
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#103454",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#F1F8FF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#224D73",
    backgroundColor: "#0B2741",
    padding: 18,
  },
  heroTitle: {
    color: "#F5FAFF",
    fontSize: 24,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#B8D1E7",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#224D73",
    backgroundColor: "#0B2741",
    padding: 16,
  },
  sectionEyebrow: {
    color: "#8FC8FF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#F1F8FF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  objectiveList: {
    gap: 12,
  },
  objectiveRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  objectiveBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#194F78",
    borderWidth: 1,
    borderColor: "#6AB8FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  objectiveBadgeText: {
    color: "#F7FBFF",
    fontSize: 12,
    fontWeight: "800",
  },
  objectiveText: {
    flex: 1,
    color: "#DCEAF8",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  bodyText: {
    color: "#D6E6F6",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
});
