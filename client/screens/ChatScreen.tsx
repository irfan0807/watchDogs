import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, FlatList, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getSocket, emitSendMessage, emitMessageRead, emitTyping } from "@/lib/socket";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { getEncryptionEnabled, getSelfDestructSeconds } from "@/lib/storage";
import * as Haptics from "expo-haptics";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  nonce: string;
  isEncrypted: boolean;
  isRead: boolean;
  createdAt: string;
  selfDestructSeconds?: number;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { contactId, contactName, contactPublicKey } = route.params;
  const { user, identityKey } = useAuth();
  const queryClient = useQueryClient();
  
  const [message, setMessage] = useState("");
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [selfDestructSeconds, setSelfDestructSeconds] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, refetch } = useQuery<Message[]>({
    queryKey: ["/api/messages", user?.id, contactId],
    enabled: !!user?.id,
  });

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <ThemedText style={styles.headerName}>{contactName}</ThemedText>
          <View style={styles.encryptedBadge}>
            <Feather name="lock" size={10} color={Colors.dark.secondary} />
            <ThemedText style={styles.encryptedText}>ENCRYPTED</ThemedText>
          </View>
        </View>
      ),
    });
  }, [navigation, contactName]);

  useEffect(() => {
    async function loadSettings() {
      const [encryption, destruct] = await Promise.all([
        getEncryptionEnabled(),
        getSelfDestructSeconds(),
      ]);
      setEncryptionEnabled(encryption);
      setSelfDestructSeconds(destruct);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg: Message) => {
      if (msg.senderId === contactId || msg.recipientId === contactId) {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", user?.id, contactId] });
        if (msg.senderId === contactId) {
          emitMessageRead(msg.id);
        }
      }
    };

    const handleTyping = ({ senderId }: { senderId: string }) => {
      if (senderId === contactId) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socket.on("message:receive", handleNewMessage);
    socket.on("message:sent", handleNewMessage);
    socket.on("message:typing", handleTyping);

    return () => {
      socket.off("message:receive", handleNewMessage);
      socket.off("message:sent", handleNewMessage);
      socket.off("message:typing", handleTyping);
    };
  }, [contactId, user?.id, queryClient]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !user || !identityKey) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let encryptedContent = message;
    let nonce = "";

    if (encryptionEnabled) {
      const encrypted = encryptMessage(message, contactPublicKey, identityKey.secretKey);
      encryptedContent = encrypted.encryptedContent;
      nonce = encrypted.nonce;
    }

    emitSendMessage({
      senderId: user.id,
      recipientId: contactId,
      encryptedContent,
      nonce,
      isEncrypted: encryptionEnabled,
      selfDestructSeconds: selfDestructSeconds || undefined,
    });

    setMessage("");
  }, [message, user, identityKey, encryptionEnabled, contactPublicKey, contactId, selfDestructSeconds]);

  const handleTypingIndicator = useCallback(() => {
    if (user) {
      emitTyping(user.id, contactId);
    }
  }, [user, contactId]);

  const decryptMessageContent = useCallback((msg: Message): string => {
    if (!msg.isEncrypted || !identityKey) {
      return msg.encryptedContent;
    }
    const decrypted = decryptMessage(msg.encryptedContent, msg.nonce, contactPublicKey, identityKey.secretKey);
    return decrypted || "[Unable to decrypt]";
  }, [identityKey, contactPublicKey]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isSent = item.senderId === user?.id;
    const content = decryptMessageContent(item);
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
      <View style={[styles.messageContainer, isSent ? styles.messageSent : styles.messageReceived]}>
        <View style={[styles.messageBubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
          <ThemedText style={styles.messageText}>{content}</ThemedText>
          <View style={styles.messageFooter}>
            {item.isEncrypted ? (
              <Feather name="lock" size={10} color={Colors.dark.secondary} />
            ) : (
              <Feather name="unlock" size={10} color={Colors.dark.danger} />
            )}
            <ThemedText style={styles.messageTime}>{time}</ThemedText>
            {isSent && (
              <Feather name={item.isRead ? "check-circle" : "check"} size={10} color={item.isRead ? Colors.dark.secondary : Colors.dark.textTertiary} />
            )}
          </View>
        </View>
      </View>
    );
  }, [user?.id, decryptMessageContent]);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={flatListRef}
          data={messages || []}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messagesList}
          ListHeaderComponent={isTyping ? (
            <View style={styles.typingContainer}>
              <ThemedText style={styles.typingText}>$ {contactName} is typing...</ThemedText>
            </View>
          ) : null}
        />

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <View style={styles.inputRow}>
            <Pressable style={[styles.encryptToggle, !encryptionEnabled && styles.encryptToggleOff]} onPress={() => setEncryptionEnabled(!encryptionEnabled)}>
              <Feather name={encryptionEnabled ? "lock" : "unlock"} size={18} color={encryptionEnabled ? Colors.dark.secondary : Colors.dark.danger} />
            </Pressable>
            <View style={styles.textInputWrapper}>
              <ThemedText style={styles.prompt}>$</ThemedText>
              <TextInput
                style={styles.textInput}
                value={message}
                onChangeText={(text) => { setMessage(text); handleTypingIndicator(); }}
                placeholder="Enter message..."
                placeholderTextColor={Colors.dark.textTertiary}
                multiline
                maxLength={1000}
              />
            </View>
            <Pressable style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed, !message.trim() && styles.sendButtonDisabled]} onPress={handleSend} disabled={!message.trim()}>
              <Feather name="send" size={18} color={message.trim() ? Colors.dark.buttonText : Colors.dark.textTertiary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.backgroundRoot },
  keyboardView: { flex: 1 },
  headerTitle: { alignItems: "center" },
  headerName: { fontSize: 16, fontWeight: "600", color: Colors.dark.text, fontFamily: Fonts?.mono },
  encryptedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  encryptedText: { fontSize: 9, color: Colors.dark.secondary, fontFamily: Fonts?.mono, letterSpacing: 0.5 },
  messagesList: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  messageContainer: { marginVertical: Spacing.xs },
  messageSent: { alignItems: "flex-end" },
  messageReceived: { alignItems: "flex-start" },
  messageBubble: { maxWidth: "80%", padding: Spacing.md, borderRadius: BorderRadius.sm },
  bubbleSent: { backgroundColor: Colors.dark.backgroundSecondary, borderLeftWidth: 3, borderLeftColor: Colors.dark.primary },
  bubbleReceived: { backgroundColor: Colors.dark.backgroundDefault, borderLeftWidth: 3, borderLeftColor: Colors.dark.secondary },
  messageText: { fontSize: 14, color: Colors.dark.text, fontFamily: Fonts?.mono },
  messageFooter: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: Spacing.xs },
  messageTime: { fontSize: 10, color: Colors.dark.textTertiary, fontFamily: Fonts?.mono },
  typingContainer: { padding: Spacing.sm },
  typingText: { fontSize: 12, color: Colors.dark.secondary, fontFamily: Fonts?.mono, fontStyle: "italic" },
  inputContainer: { borderTopWidth: 1, borderTopColor: Colors.dark.border, paddingTop: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.dark.backgroundRoot },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.sm },
  encryptToggle: { width: 40, height: 40, borderRadius: BorderRadius.sm, backgroundColor: Colors.dark.backgroundDefault, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.dark.secondary },
  encryptToggleOff: { borderColor: Colors.dark.danger },
  textInputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Colors.dark.backgroundDefault, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.dark.border, paddingHorizontal: Spacing.md, minHeight: 40, maxHeight: 100 },
  prompt: { fontSize: 14, color: Colors.dark.secondary, fontFamily: Fonts?.mono, marginRight: Spacing.xs },
  textInput: { flex: 1, fontSize: 14, color: Colors.dark.text, fontFamily: Fonts?.mono, paddingVertical: Spacing.sm },
  sendButton: { width: 40, height: 40, borderRadius: BorderRadius.sm, backgroundColor: Colors.dark.primary, justifyContent: "center", alignItems: "center" },
  sendButtonPressed: { opacity: 0.8 },
  sendButtonDisabled: { backgroundColor: Colors.dark.backgroundSecondary },
});
