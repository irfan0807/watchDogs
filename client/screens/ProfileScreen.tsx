import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  getEncryptionEnabled,
  setEncryptionEnabled,
  getSelfDestructSeconds,
  setSelfDestructSeconds,
} from "@/lib/storage";

const SELF_DESTRUCT_OPTIONS = [
  { label: "OFF", value: null },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "1h", value: 3600 },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout } = useAuth();
  const [encryptionEnabled, setEncryptionEnabledState] = useState(true);
  const [selfDestruct, setSelfDestructState] = useState<number | null>(null);

  React.useEffect(() => {
    async function loadSettings() {
      const [encryption, destruct] = await Promise.all([
        getEncryptionEnabled(),
        getSelfDestructSeconds(),
      ]);
      setEncryptionEnabledState(encryption);
      setSelfDestructState(destruct);
    }
    loadSettings();
  }, []);

  const toggleEncryption = useCallback(async () => {
    const newValue = !encryptionEnabled;
    setEncryptionEnabledState(newValue);
    await setEncryptionEnabled(newValue);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [encryptionEnabled]);

  const handleSelfDestruct = useCallback(async (value: number | null) => {
    setSelfDestructState(value);
    await setSelfDestructSeconds(value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleShare = useCallback(async () => {
    if (!user) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Connect with me on Watchdog! My pairing code: ${user.pairingCode}`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
  }, [logout]);

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText style={styles.title}>PROFILE</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.qrSection}>
          <View style={styles.qrPlaceholder}>
            <ThemedText style={styles.qrCode}>{user.pairingCode}</ThemedText>
          </View>
          <ThemedText style={styles.username}>{user.username}</ThemedText>
          <View style={styles.codeContainer}>
            <ThemedText style={styles.codeLabel}>PAIRING CODE</ThemedText>
            <ThemedText style={styles.code}>{user.pairingCode}</ThemedText>
          </View>
          <Pressable style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]} onPress={handleShare}>
            <Feather name="share-2" size={16} color={Colors.dark.primary} />
            <ThemedText style={styles.shareButtonText}>SHARE CODE</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>$ SECURITY</ThemedText>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Feather name="lock" size={18} color={encryptionEnabled ? Colors.dark.secondary : Colors.dark.danger} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>End-to-End Encryption</ThemedText>
                <ThemedText style={styles.settingDescription}>{encryptionEnabled ? "All messages are encrypted" : "Messages sent unencrypted"}</ThemedText>
              </View>
            </View>
            <Pressable style={[styles.toggle, encryptionEnabled && styles.toggleActive]} onPress={toggleEncryption}>
              <View style={[styles.toggleKnob, encryptionEnabled && styles.toggleKnobActive]} />
            </Pressable>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Feather name="clock" size={18} color={Colors.dark.warning} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>Self-Destruct Timer</ThemedText>
                <ThemedText style={styles.settingDescription}>Messages auto-delete after being read</ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.destructOptions}>
            {SELF_DESTRUCT_OPTIONS.map((option) => (
              <Pressable key={option.label} style={[styles.destructOption, selfDestruct === option.value && styles.destructOptionActive]} onPress={() => handleSelfDestruct(option.value)}>
                <ThemedText style={[styles.destructOptionText, selfDestruct === option.value && styles.destructOptionTextActive]}>{option.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>$ ACCOUNT</ThemedText>
          <Pressable style={({ pressed }) => [styles.dangerButton, pressed && styles.dangerButtonPressed]} onPress={handleLogout}>
            <Feather name="log-out" size={18} color={Colors.dark.danger} />
            <ThemedText style={styles.dangerButtonText}>LOG OUT</ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>WATCHDOG v1.0.0</ThemedText>
          <ThemedText style={styles.footerSubtext}>$ Secure. Private. Encrypted.</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.backgroundRoot },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  title: { fontSize: 18, fontWeight: "700", color: Colors.dark.text, fontFamily: Fonts?.mono, letterSpacing: 2 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  qrSection: { alignItems: "center", marginBottom: Spacing["2xl"] },
  qrPlaceholder: { width: 160, height: 160, backgroundColor: Colors.dark.backgroundDefault, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.lg, justifyContent: "center", alignItems: "center" },
  qrCode: { fontSize: 24, fontWeight: "700", color: Colors.dark.primary, fontFamily: Fonts?.mono, letterSpacing: 2 },
  username: { fontSize: 20, fontWeight: "700", color: Colors.dark.text, fontFamily: Fonts?.mono, letterSpacing: 1, marginBottom: Spacing.sm },
  codeContainer: { alignItems: "center", marginBottom: Spacing.md },
  codeLabel: { fontSize: 10, color: Colors.dark.textSecondary, fontFamily: Fonts?.mono, letterSpacing: 1, marginBottom: Spacing.xs },
  code: { fontSize: 18, fontWeight: "600", color: Colors.dark.primary, fontFamily: Fonts?.mono, letterSpacing: 2 },
  shareButton: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.primary },
  shareButtonPressed: { backgroundColor: Colors.dark.backgroundDefault },
  shareButtonText: { fontSize: 12, fontWeight: "600", color: Colors.dark.primary, fontFamily: Fonts?.mono, letterSpacing: 0.5 },
  section: { marginBottom: Spacing["2xl"] },
  sectionTitle: { fontSize: 12, color: Colors.dark.textSecondary, fontFamily: Fonts?.mono, letterSpacing: 0.5, marginBottom: Spacing.md },
  settingItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.dark.backgroundDefault, padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.sm },
  settingInfo: { flexDirection: "row", alignItems: "center", flex: 1, gap: Spacing.md },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: Colors.dark.text, fontFamily: Fonts?.mono, marginBottom: 2 },
  settingDescription: { fontSize: 11, color: Colors.dark.textSecondary, fontFamily: Fonts?.mono },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.dark.backgroundSecondary, padding: 2, justifyContent: "center" },
  toggleActive: { backgroundColor: Colors.dark.secondary },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.dark.textSecondary },
  toggleKnobActive: { backgroundColor: Colors.dark.backgroundRoot, alignSelf: "flex-end" },
  destructOptions: { flexDirection: "row", gap: Spacing.sm },
  destructOption: { flex: 1, paddingVertical: Spacing.sm, backgroundColor: Colors.dark.backgroundDefault, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.border, alignItems: "center" },
  destructOptionActive: { backgroundColor: Colors.dark.warning, borderColor: Colors.dark.warning },
  destructOptionText: { fontSize: 11, fontWeight: "600", color: Colors.dark.textSecondary, fontFamily: Fonts?.mono },
  destructOptionTextActive: { color: Colors.dark.backgroundRoot },
  dangerButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, backgroundColor: Colors.dark.backgroundDefault, padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.danger },
  dangerButtonPressed: { backgroundColor: Colors.dark.backgroundSecondary },
  dangerButtonText: { fontSize: 14, fontWeight: "600", color: Colors.dark.danger, fontFamily: Fonts?.mono, letterSpacing: 0.5 },
  footer: { alignItems: "center", paddingTop: Spacing.xl, paddingBottom: Spacing["2xl"] },
  footerText: { fontSize: 12, color: Colors.dark.textTertiary, fontFamily: Fonts?.mono, letterSpacing: 1, marginBottom: Spacing.xs },
  footerSubtext: { fontSize: 10, color: Colors.dark.textTertiary, fontFamily: Fonts?.mono },
});
