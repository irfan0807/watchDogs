import React, { useState, useCallback } from "react";
import { View, TextInput, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { emitContactRequest } from "@/lib/socket";
import { apiRequest } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!code.trim() || !user) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await apiRequest("GET", `/api/users/code/${code.trim().toUpperCase()}`);
      
      if (!response.ok) {
        setError("User not found with this code");
        setIsLoading(false);
        return;
      }

      const foundUser = await response.json();

      if (foundUser.id === user.id) {
        setError("You cannot add yourself as a contact");
        setIsLoading(false);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      emitContactRequest({
        fromUserId: user.id,
        toUserId: foundUser.id,
      });

      Alert.alert(
        "Request Sent",
        `Connection request sent to ${foundUser.username}. They will need to accept your request.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      setError(err.message || "Failed to find user");
    } finally {
      setIsLoading(false);
    }
  }, [code, user, navigation]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: Spacing["2xl"], paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.cameraPlaceholder}>
          <Feather name="camera-off" size={48} color={Colors.dark.textTertiary} />
          <ThemedText style={styles.placeholderText}>
            Camera scanning available in Expo Go
          </ThemedText>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>OR ENTER CODE</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputSection}>
          <ThemedText style={styles.label}>&gt; ENTER PAIRING CODE</ThemedText>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.prompt}>$</ThemedText>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="XXXXXXXX"
              placeholderTextColor={Colors.dark.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
          </View>

          {error ? (
            <ThemedText style={styles.error}>[ERROR] {error}</ThemedText>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              (!code.trim() || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!code.trim() || isLoading}
          >
            <Feather name="user-plus" size={18} color={Colors.dark.buttonText} />
            <ThemedText style={styles.buttonText}>
              {isLoading ? "SEARCHING..." : "SEND REQUEST"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <Feather name="info" size={14} color={Colors.dark.primary} />
          <ThemedText style={styles.infoText}>
            Ask your contact to share their pairing code from their Profile screen. 
            Once you send a request, they will need to accept it before you can start messaging.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.backgroundRoot },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  cameraPlaceholder: { height: 200, backgroundColor: Colors.dark.backgroundDefault, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.dark.border, justifyContent: "center", alignItems: "center", marginBottom: Spacing.xl },
  placeholderText: { fontSize: 12, color: Colors.dark.textTertiary, fontFamily: Fonts?.mono, marginTop: Spacing.md, textAlign: "center" },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.dark.border },
  dividerText: { fontSize: 12, color: Colors.dark.textSecondary, fontFamily: Fonts?.mono, paddingHorizontal: Spacing.md, letterSpacing: 0.5 },
  inputSection: { marginBottom: Spacing.xl },
  label: { fontSize: 14, color: Colors.dark.secondary, fontFamily: Fonts?.mono, marginBottom: Spacing.md, letterSpacing: 0.5 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.dark.backgroundDefault, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, height: Spacing.inputHeight, marginBottom: Spacing.lg },
  prompt: { fontSize: 16, color: Colors.dark.secondary, fontFamily: Fonts?.mono, marginRight: Spacing.sm },
  input: { flex: 1, fontSize: 18, color: Colors.dark.text, fontFamily: Fonts?.mono, letterSpacing: 4 },
  error: { fontSize: 12, color: Colors.dark.danger, fontFamily: Fonts?.mono, marginBottom: Spacing.lg },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.dark.primary, height: Spacing.buttonHeight, borderRadius: BorderRadius.sm, gap: Spacing.sm },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: "600", color: Colors.dark.buttonText, fontFamily: Fonts?.mono, letterSpacing: 1 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: Colors.dark.backgroundDefault, borderWidth: 1, borderColor: Colors.dark.border, borderRadius: BorderRadius.sm, padding: Spacing.md, gap: Spacing.sm },
  infoText: { flex: 1, fontSize: 12, color: Colors.dark.textSecondary, fontFamily: Fonts?.mono, lineHeight: 18 },
});
