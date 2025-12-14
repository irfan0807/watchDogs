import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { getSocket } from "@/lib/socket";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Contact {
  id: string;
  userId: string;
  contactId: string;
  status: string;
  isVerified: boolean;
  contact: {
    id: string;
    username: string;
    publicKey: string;
    isOnline: boolean;
    lastSeen: string;
  };
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const { data: contacts, isLoading, refetch } = useQuery<Contact[]>({
    queryKey: ["/api/contacts", user?.id],
    enabled: !!user?.id,
  });

  useEffect(() => {
    const socket = getSocket();
    
    const handleUserStatus = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    socket.on("user:status", handleUserStatus);

    return () => {
      socket.off("user:status", handleUserStatus);
    };
  }, []);

  const openChat = useCallback((contact: Contact) => {
    navigation.navigate("Chat", {
      contactId: contact.contactId,
      contactName: contact.contact.username,
      contactPublicKey: contact.contact.publicKey,
    });
  }, [navigation]);

  const openScanner = useCallback(() => {
    navigation.navigate("Scanner");
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Contact }) => {
    const isOnline = onlineUsers.has(item.contactId) || item.contact.isOnline;
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.chatItem,
          pressed && styles.chatItemPressed,
        ]}
        onPress={() => openChat(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              [{item.contact.username.substring(0, 2).toUpperCase()}]
            </ThemedText>
          </View>
          <View style={[styles.statusDot, isOnline && styles.statusOnline]} />
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <ThemedText style={styles.contactName}>
              {item.contact.username}
            </ThemedText>
            {item.isVerified ? (
              <Feather name="check-circle" size={14} color={Colors.dark.secondary} />
            ) : (
              <Feather name="alert-triangle" size={14} color={Colors.dark.warning} />
            )}
          </View>
          <View style={styles.chatPreview}>
            <Feather name="lock" size={12} color={Colors.dark.secondary} />
            <ThemedText style={styles.previewText} numberOfLines={1}>
              Encrypted conversation
            </ThemedText>
          </View>
        </View>
        
        <Feather name="chevron-right" size={18} color={Colors.dark.textTertiary} />
      </Pressable>
    );
  }, [onlineUsers, openChat]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="message-square" size={48} color={Colors.dark.textTertiary} />
      </View>
      <ThemedText style={styles.emptyTitle}>NO ACTIVE CHATS</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        $ Scan a QR code or enter a pairing code to connect with someone
      </ThemedText>
      <Pressable
        style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
        onPress={openScanner}
      >
        <Feather name="maximize" size={18} color={Colors.dark.buttonText} />
        <ThemedText style={styles.scanButtonText}>SCAN QR CODE</ThemedText>
      </Pressable>
    </View>
  ), [openScanner]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.titleRow}>
          <Feather name="shield" size={24} color={Colors.dark.primary} />
          <ThemedText style={styles.title}>WATCHDOG</ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          onPress={openScanner}
        >
          <Feather name="maximize" size={22} color={Colors.dark.primary} />
        </Pressable>
      </View>

      <FlatList
        data={contacts?.filter(c => c.status === "accepted") || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.dark.primary}
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.primary,
    fontFamily: Fonts?.mono,
    letterSpacing: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundDefault,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconButtonPressed: {
    borderColor: Colors.dark.primary,
  },
  list: {
    flexGrow: 1,
    paddingTop: Spacing.sm,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  chatItemPressed: {
    backgroundColor: Colors.dark.backgroundDefault,
  },
  avatarContainer: {
    position: "relative",
    marginRight: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark.primary,
    fontFamily: Fonts?.mono,
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.dark.offline,
    borderWidth: 2,
    borderColor: Colors.dark.backgroundRoot,
  },
  statusOnline: {
    backgroundColor: Colors.dark.online,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark.text,
    fontFamily: Fonts?.mono,
  },
  chatPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  previewText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontFamily: Fonts?.mono,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["5xl"],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.backgroundDefault,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.textSecondary,
    fontFamily: Fonts?.mono,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
    fontFamily: Fonts?.mono,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.xl,
    height: 44,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  scanButtonPressed: {
    opacity: 0.8,
  },
  scanButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.dark.buttonText,
    fontFamily: Fonts?.mono,
    letterSpacing: 0.5,
  },
});
