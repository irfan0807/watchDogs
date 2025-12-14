import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"username" | "generating" | "complete">("username");

  const handleRegister = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setError(null);
    setIsLoading(true);
    setStep("generating");

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await register(username.trim());
      setStep("complete");
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setStep("username");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="shield" size={48} color={Colors.dark.primary} />
          </View>
          <ThemedText style={styles.title}>WATCHDOG</ThemedText>
          <ThemedText style={styles.subtitle}>
            $ SECURE TERMINAL MESSENGER
          </ThemedText>
        </View>

        {step === "username" && (
          <View style={styles.form}>
            <ThemedText style={styles.label}>&gt; ENTER USERNAME</ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.prompt}>$</ThemedText>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={Colors.dark.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              <View style={styles.cursor} />
            </View>

            {error ? (
              <ThemedText style={styles.error}>[ERROR] {error}</ThemedText>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                !username.trim() && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!username.trim() || isLoading}
            >
              <ThemedText style={styles.buttonText}>
                GENERATE KEYS
              </ThemedText>
              <Feather name="arrow-right" size={18} color={Colors.dark.buttonText} />
            </Pressable>

            <View style={styles.infoBox}>
              <Feather name="lock" size={14} color={Colors.dark.secondary} />
              <ThemedText style={styles.infoText}>
                End-to-end encryption keys will be generated locally on your device.
                Your private keys never leave this device.
              </ThemedText>
            </View>
          </View>
        )}

        {step === "generating" && (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <ThemedText style={styles.generatingText}>
              $ GENERATING ENCRYPTION KEYS...
            </ThemedText>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
            </View>
            <ThemedText style={styles.generatingSubtext}>
              Creating identity keys{"\n"}
              Generating signed pre-key{"\n"}
              Securing local storage
            </ThemedText>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.backgroundDefault,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.dark.primary,
    letterSpacing: 4,
    fontFamily: Fonts?.mono,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontFamily: Fonts?.mono,
    letterSpacing: 1,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: Colors.dark.secondary,
    fontFamily: Fonts?.mono,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundDefault,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    height: Spacing.inputHeight,
    marginBottom: Spacing.lg,
  },
  prompt: {
    fontSize: 16,
    color: Colors.dark.secondary,
    fontFamily: Fonts?.mono,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
    fontFamily: Fonts?.mono,
    padding: 0,
  },
  cursor: {
    width: 8,
    height: 18,
    backgroundColor: Colors.dark.primary,
    opacity: 0.7,
  },
  error: {
    fontSize: 12,
    color: Colors.dark.danger,
    fontFamily: Fonts?.mono,
    marginBottom: Spacing.lg,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  buttonPressed: {
    opacity: 0.8,
    backgroundColor: Colors.dark.borderGlow,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.buttonText,
    fontFamily: Fonts?.mono,
    letterSpacing: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.dark.backgroundDefault,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing["2xl"],
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontFamily: Fonts?.mono,
    lineHeight: 18,
  },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  generatingText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontFamily: Fonts?.mono,
    marginTop: Spacing.xl,
    letterSpacing: 0.5,
  },
  progressContainer: {
    width: "100%",
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.dark.backgroundDefault,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "60%",
    backgroundColor: Colors.dark.secondary,
  },
  generatingSubtext: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontFamily: Fonts?.mono,
    textAlign: "center",
    lineHeight: 20,
  },
});
