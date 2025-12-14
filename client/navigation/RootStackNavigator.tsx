import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import RegisterScreen from "@/screens/RegisterScreen";
import ChatScreen from "@/screens/ChatScreen";
import ScannerScreen from "@/screens/ScannerScreen";
import VerifyContactScreen from "@/screens/VerifyContactScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/theme";
import { ActivityIndicator, View } from "react-native";

export type RootStackParamList = {
  Register: undefined;
  Main: undefined;
  Chat: { contactId: string; contactName: string; contactPublicKey: string };
  Scanner: undefined;
  VerifyContact: { contactId: string; contactName: string; contactPublicKey: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.dark.backgroundRoot }}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        headerStyle: {
          backgroundColor: Colors.dark.backgroundRoot,
        },
        headerTintColor: Colors.dark.primary,
        contentStyle: {
          backgroundColor: Colors.dark.backgroundRoot,
        },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              headerTitle: "",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="Scanner"
            component={ScannerScreen}
            options={{
              presentation: "modal",
              headerTitle: "SCAN QR CODE",
            }}
          />
          <Stack.Screen
            name="VerifyContact"
            component={VerifyContactScreen}
            options={{
              headerTitle: "VERIFY CONTACT",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
