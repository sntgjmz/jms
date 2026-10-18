import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type AppDialogKind = "error" | "info" | "success";

type AppDialogProps = {
  visible: boolean;
  kind?: AppDialogKind;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
};

export default function AppDialog({
  visible,
  kind = "info",
  title,
  message,
  buttonText = "OK",
  onClose,
}: AppDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.head}>
            <View style={[styles.iconWrap, kind === "error" ? styles.iconError : kind === "success" ? styles.iconSuccess : styles.iconInfo]}>
              <Ionicons
                name={kind === "error" ? "alert-circle-outline" : kind === "success" ? "checkmark-circle-outline" : "information-circle-outline"}
                size={17}
                color="#EAF6FF"
              />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={[styles.button, kind === "error" ? styles.buttonError : kind === "success" ? styles.buttonSuccess : styles.buttonInfo]} onPress={onClose}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(3, 15, 28, 0.72)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  card: { width: "100%", maxWidth: 430, borderRadius: 16, borderWidth: 1, borderColor: "#2D5A7B", backgroundColor: "#08233B", padding: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 9 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  iconError: { backgroundColor: "#4C1F2A", borderColor: "#7F2F42" },
  iconSuccess: { backgroundColor: "#164531", borderColor: "#2A7B58" },
  iconInfo: { backgroundColor: "#173D57", borderColor: "#296488" },
  title: { flex: 1, color: "#F1F8FF", fontSize: 15, fontWeight: "800" },
  message: { marginTop: 10, color: "#BCD2E6", fontSize: 13, lineHeight: 19 },
  button: { marginTop: 14, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonError: { backgroundColor: "#A13B4F" },
  buttonSuccess: { backgroundColor: "#2D8A60" },
  buttonInfo: { backgroundColor: "#367AE2" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
