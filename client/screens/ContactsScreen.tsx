import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { getSocket, emitContactAccept, emitContactReject, emitContactDelete } from "@/lib/socket";
import * as Haptics from "expo-haptics";

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
  };
}

interface ContactRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  fromUser: {
    id: string;
    username: string;
    publicKey: string;
  };
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const { data: contacts, isLoading: contactsLoading, refetch: refetchContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts", user?.id],
    enabled: !!user?.id,
  });

  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery<ContactRequest[]>({
    queryKey: ["/api/contact-requests", user?.id],
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

    const handleContactRequest = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchRequests();
    };

    const handleContactAccepted = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchContacts();
      refetchRequests();
    };

    const handleContactDeleted = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      refetchContacts();
    };

    socket.on("user:status", handleUserStatus);
    socket.on("contact:request:received", handleContactRequest);
    socket.on("contact:accepted", handleContactAccepted);
    socket.on("contact:deleted", handleContactDeleted);
    socket.on("contact:deleted:success", handleContactDeleted);

    return () => {
      socket.off("user:status", handleUserStatus);
      socket.off("contact:request:received", handleContactRequest);
      socket.off("contact:accepted", handleContactAccepted);
      socket.off("contact:deleted", handleContactDeleted);
      socket.off("contact:deleted:success", handleContactDeleted);
    };
  }, [refetchRequests, refetchContacts]);

  const handleAccept = useCallback(async (request: ContactRequest) => {
    if (!user) return;
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    emitContactAccept({
      requestId: request.id,
      userId: user.id,
      contactId: request.fromUserId,
    });
    
    queryClient.invalidateQueries({ queryKey: ["/api/contacts", user.id] });
    queryClient.invalidateQueries({ queryKey: ["/api/contact-requests", user.id] });
  }, [user, queryClient]);

  const handleReject = useCallback(async (request: ContactRequest) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    emitContactReject(request.id);
    refetchRequests();
  }, [refetchRequests]);

  const handleDeleteContact = useCallback((contact: Contact) => {
    if (!user) return;
    
    Alert.alert(
      "Delete Contact",
      `Remove ${contact.contact.username} from your contacts? This will also remove you from their contacts.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            emitContactDelete(user.id, contact.contactId);
          },
        },
      ]
    );
  }, [user]);

  const openScanner = useCallback(() => {
    navigation.navigate("Scanner");
  }, [navigation]);

  const openVerify = useCallback((contact: Contact) => {
    navigation.navigate("VerifyContact", {
      contactId: contact.contactId,
      contactName: contact.contact.username,
      contactPublicKey: contact.contact.publicKey,
    });
  }, [navigation]);

  const renderRequest = useCallback(({ item }: { item: ContactRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            [{item.fromUser.username.substring(0, 2).toUpperCase()}]
          </ThemedText>
        </View>
        <View style={styles.requestText}>
          <ThemedText style={styles.requestName}>{item.fromUser.username}</ThemedText>
          <ThemedText style={styles.requestLabel}>wants to connect</ThemedText>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={({ pressed }) => [styles.acceptButton, pressed && styles.buttonPressed]}
          onPress={() => handleAccept(item)}
        >
          <Feather name="check" size={18} color={Colors.dark.buttonText} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.rejectButton, pressed && styles.buttonPressed]}
          onPress={() => handleReject(item)}
        >
          <Feather name="x" size={18} color={Colors.dark.danger} />
        </Pressable>
      </View>
    </View>
  ), [handleAccept, handleReject]);

  const renderContact = useCallback(({ item }: { item: Contact }) => {
    const isOnline = onlineUsers.has(item.contactId) || item.contact.isOnline;
    
    return (
      <View style={styles.contactItem}>
        <Pressable
          style={({ pressed }) => [styles.contactTouchable, pressed && styles.contactItemPressed]}
          onPress={() => openVerify(item)}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                [{item.contact.username.substring(0, 2).toUpperCase()}]
              </ThemedText>
            </View>
            <View style={[styles.statusDot, isOnline && styles.statusOnline]} />
          </View>
          
          <View style={styles.contactInfo}>
            <ThemedText style={styles.contactName}>{item.contact.username}</ThemedText>
            <View style={styles.verifyRow}>
              {item.isVerified ? (
                <>
                  <Feather name="check-circle" size={12} color={Colors.dark.secondary} />
                  <ThemedText style={styles.verifiedText}>VERIFIED</ThemedText>
                </>
              ) : (
                <>
                  <Feather name="alert-triangle" size={12} color={Colors.dark.warning} />
                  <ThemedText style={styles.unverifiedText}>TAP TO VERIFY</ThemedText>
                </>
              )}
            </View>
          </View>
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}
          onPress={() => handleDeleteContact(item)}
        >
          <Feather name="trash-2" size={16} color={Colors.dark.danger} />
        </Pressable>
      </View>
    );
  }, [onlineUsers, openVerify, handleDeleteContact]);

  const acceptedContacts = contacts?.filter(c => c.status === "accepted") || [];
  const pendingRequests = requests?.filter(r => r.status === "pending") || [];

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <ThemedText style={styles.title}>CONTACTS</ThemedText>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={openScanner}
        >
          <Feather name="user-plus" size={18} color={Colors.dark.primary} />
        </Pressable>
      </View>

      <FlatList
        data={[...pendingRequests.map(r => ({ type: "request" as const, data: r })), ...acceptedContacts.map(c => ({ type: "contact" as const, data: c }))]}
        keyExtractor={(item) => item.data.id}
        renderItem={({ item }) => 
          item.type === "request" 
            ? renderRequest({ item: item.data as ContactRequest })
            : renderContact({ item: item.data as Contact })
        }
        ListHeaderComponent={
          pendingRequests.length > 0 ? (
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                $ PENDING REQUESTS ({pendingRequests.length})
              </ThemedText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Feather name="users" size={48} color={Colors.dark.textTertiary} />
            </View>
            <ThemedText style={styles.emptyTitle}>NO CONTACTS YET</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              $ Scan a QR code to add secure contacts
            </ThemedText>
          </View>
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarHeight + Spacing.xl + 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={contactsLoading || requestsLoading}
            onRefresh={() => { refetchContacts(); refetchRequests(); }}
            tintColor={Colors.dark.primary}
          />
        }
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: tabBarHeight + Spacing.xl },
          pressed && styles.fabPressed,
        ]}
        onPress={openScanner}
      >
        <Feather name="maximize" size={24} color={Colors.dark.buttonText} />
      </Pressable>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    fontFamily: Fonts?.mono,
    letterSpacing: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundDefault,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  addButtonPressed: {
    borderColor: Colors.dark.primary,
  },
  list: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dark.backgroundDefault,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.dark.warning,
    fontFamily: Fonts?.mono,
    letterSpacing: 0.5,
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundDefault,
  },
  requestInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  requestText: {
    marginLeft: Spacing.md,
  },
  requestName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark.text,
    fontFamily: Fonts?.mono,
  },
  requestLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontFamily: Fonts?.mono,
  },
  requestActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.danger,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  contactTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactItemPressed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.dark.primary,
    fontFamily: Fonts?.mono,
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.offline,
    borderWidth: 2,
    borderColor: Colors.dark.backgroundRoot,
  },
  statusOnline: {
    backgroundColor: Colors.dark.online,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.danger,
    marginLeft: Spacing.sm,
  },
  contactInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark.text,
    fontFamily: Fonts?.mono,
    marginBottom: 2,
  },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  verifiedText: {
    fontSize: 11,
    color: Colors.dark.secondary,
    fontFamily: Fonts?.mono,
    letterSpacing: 0.5,
  },
  unverifiedText: {
    fontSize: 11,
    color: Colors.dark.warning,
    fontFamily: Fonts?.mono,
    letterSpacing: 0.5,
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
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
