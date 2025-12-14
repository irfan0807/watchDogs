import React, { useMemo, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { generateSafetyNumber } from "@/lib/crypto";
import * as Haptics from "expo-haptics";
import { getApiUrl } from "@/lib/query-client";

type VerifyRouteProp = RouteProp<RootStackParamList, "VerifyContact">;

export default function VerifyContactScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<VerifyRouteProp>();
  const navigation = useNavigation();
  const { contactName, contactPublicKey } = route.params;
  const { user } = useAuth();

  const safetyNumber = useMemo(() => {
    if (!user?.publicKey || !contactPublicKey) return "";
    return generateSafetyNumber(user.publicKey, contactPublicKey);
  }, [user?.publicKey, contactPublicKey]);

  const handleVerify = useCallback(async () => {
    try {
      const { contactId } = route.params;
      await fetch(`${getApiUrl()}/api/contacts/${contactId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user?.id,
          isVerified: true, 
          safetyNumber 
        }),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [navigation, route.params, user?.id, safetyNumber]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="shield" size={32} color={Colors.dark.secondary} />
          </View>
          <ThemedText style={styles.title}>VERIFY {contactName.toUpperCase()}</ThemedText>
          <ThemedText style={styles.subtitle}>
            Compare this safety number with {contactName} to ensure your conversation is secure
          </ThemedText>
        </View>

        <View style={styles.safetyNumberContainer}>
          <ThemedText style={styles.safetyLabel}>SAFETY NUMBER</ThemedText>
          <View style={styles.numberGrid}>
            {safetyNumber.split(" ").map((group, index) => (
              <View key={index} style={styles.numberGroup}>
                <ThemedText style={styles.numberText}>{group}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.instructionsContainer}>
          <ThemedText style={styles.instructionsTitle}>$ HOW TO VERIFY</ThemedText>
          <View style={styles.instruction}>
            <ThemedText style={styles.instructionNumber}>1.</ThemedText>
            <ThemedText style={styles.instructionText}>
              Meet with {contactName} in person or via a secure video call
            </ThemedText>
          </View>
          <View style={styles.instruction}>
            <ThemedText style={styles.instructionNumber}>2.</ThemedText>
            <ThemedText style={styles.instructionText}>
              Ask them to open this verification screen on their device
            </ThemedText>
          </View>
          <View style={styles.instruction}>
            <ThemedText style={styles.instructionNumber}>3.</ThemedText>
            <ThemedText style={styles.instructionText}>
              Compare the safety numbers on both devices - they should match exactly
            </ThemedText>
          </View>
          <View style={styles.instruction}>
            <ThemedText style={styles.instructionNumber}>4.</ThemedText>
            <ThemedText style={styles.instructionText}>
              If they match, tap "Mark as Verified" below
            </ThemedText>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Feather name="alert-triangle" size={14} color={Colors.dark.warning} />
          <ThemedText style={styles.warningText}>
            If the numbers do not match, do not proceed. Your conversation may be compromised.
          </ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [styles.verifyButton, pressed && styles.verifyButtonPressed]}
          onPress={handleVerify}
        >
          <Feather name="check-circle" size={18} color={Colors.dark.buttonText} />
          <ThemedText style={styles.verifyButtonText}>MARK AS VERIFIED</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.backgroundRoot },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  header: { alignItems: "center", marginBottom: Spacing["2xl"] },
  iconContainer: { width: 64, height: 64, borderRadius: BorderRadius.lg, backgroundColor: Colors.dark.backgroundDefault, borderWidth: 1, borderColor: Colors.dark.secondary, justifyContent: "center", alignItems: "center", marginBottom: Spacing.lg },
  title: { fontSize: 18, fontWeight: "700", color: Colors.dark.text, fontFamily: Fonts?.mono, letterSpacing: 1, marginBottom: Spacing.sm, textAlign: "center" },
  subtitle: { fontSize: 13, color: Colors.dark.textSecondary, fontFamily: Fonts?.mono, textAlign: "center", lineHeight: 20 },
  safetyNumberContainer: { backgroundColor: Colors.dark.backgroundDefault, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, padding: Spacing.lg, marginBottom: Spacing.xl },
  safetyLabel: { fontSize: 10, color: Colors.dark.textSecondary, fontFamily: Fonts?.mono, letterSpacing: 1, marginBottom: Spacing.md, textAlign: "center" },
  numberGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: Spacing.sm },
  numberGroup: { backgroundColor: Colors.dark.backgroundSecondary, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs },
  numberText: { fontSize: 12, fontWeight: "600", color: Colors.dark.primary, fontFamily: Fonts?.mono, letterSpacing: 1 },
  instructionsContainer: { marginBottom: Spacing.xl },
  instructionsTitle: { fontSize: 12, color: Colors.dark.secondary, fontFamily: Fonts?.mono, letterSpacing: 0.5, marginBottom: Spacing.md },
  instruction: { flexDirection: "row", marginBottom: Spacing.md },
  instructionNumber: { fontSize: 13, color: Colors.dark.primary, fontFamily: Fonts?.mono, width: 20 },
  instructionText: { flex: 1, fontSize: 13, color: Colors.dark.text, fontFamily: Fonts?.mono, lineHeight: 20 },
  warningBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: Colors.dark.backgroundDefault, borderWidth: 1, borderColor: Colors.dark.warning, borderRadius: BorderRadius.sm, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.xl },
  warningText: { flex: 1, fontSize: 12, color: Colors.dark.warning, fontFamily: Fonts?.mono, lineHeight: 18 },
  verifyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.dark.secondary, height: Spacing.buttonHeight, borderRadius: BorderRadius.sm, gap: Spacing.sm },
  verifyButtonPressed: { opacity: 0.8 },
  verifyButtonText: { fontSize: 14, fontWeight: "600", color: Colors.dark.buttonText, fontFamily: Fonts?.mono, letterSpacing: 1 },
});
