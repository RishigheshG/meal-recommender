import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

import AuthScreen from "../screens/AuthScreen";
import PantryScreen from "../screens/PantryScreen";
import AddEditItemScreen from "../screens/AddEditItemScreen";
import CookScreen from "../screens/CookScreen";
import BarcodeScanScreen from "../screens/BarcodeScanScreen";
import ShoppingListScreen from "../screens/ShoppingListScreen";
import VoiceAddScreen from "../screens/VoiceAddScreen";
import MacrosScreen from "../screens/MacrosScreen";

export type RootStackParamList = {
  Auth: undefined;
  Pantry: undefined;
  Cook: undefined;
  AddEditItem: { id?: string; barcode?: string; prefillName?: string; prefillQuantity?: number; prefillUnit?: string } | undefined;
  BarcodeScan: undefined;
  ShoppingList: undefined;
  VoiceAdd: undefined;
  Macros: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Pantry" component={PantryScreen} options={{ title: "Pantry" }} />
            <Stack.Screen name="Cook" component={CookScreen} options={{ title: "Cook" }} />
            <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: "Shopping List" }} />
            <Stack.Screen name="Macros" component={MacrosScreen} options={{ title: "Macros" }} />
            <Stack.Screen name="VoiceAdd" component={VoiceAddScreen} options={{ title: "Voice Add" }} />
            <Stack.Screen name="AddEditItem" component={AddEditItemScreen} options={{ title: "Add / Edit Item" }} />
            <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} options={{ title: "Scan Barcode" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}