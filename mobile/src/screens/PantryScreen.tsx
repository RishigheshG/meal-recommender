import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../nav/AppNavigator";
import { supabase } from "../lib/supabase";
import { PantryItem } from "../types/pantry";
import { urgencyLabel, daysUntil } from "../utils/expiry";

type Props = NativeStackScreenProps<RootStackParamList, "Pantry">;

export default function PantryScreen({ navigation }: Props) {
  const [useUpSoon, setUseUpSoon] = useState(false);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as PantryItem[]);
    } catch (e: any) {
      Alert.alert("Load failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const renderItem = ({ item }: { item: PantryItem }) => {
    const expiry = item.expiry_date ? ` • expires ${item.expiry_date}` : "";
    const u = urgencyLabel(item.expiry_date);

    return (
      <Pressable style={styles.card} onPress={() => navigation.navigate("AddEditItem", { id: item.id })}>
        <Text style={styles.name}>{item.display_name}</Text>
        <Text style={styles.meta}>
          {item.quantity} {item.unit} • {item.location}
          {expiry}
        </Text>
        {u.level > 0 && (
          <Text style={[styles.badge, u.level >= 3 && styles.badgeHot]}>{u.label}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable style={styles.btn} onPress={() => navigation.navigate("AddEditItem")}>
          <Text style={styles.btnText}>+ Add</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => navigation.navigate("BarcodeScan")}>
          <Text style={styles.btnText}>Scan</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => navigation.navigate("VoiceAdd")}>
          <Text style={styles.btnText}>Voice</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => navigation.navigate("Cook")}>
          <Text style={styles.btnText}>Cook</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => navigation.navigate("Macros")}>
          <Text style={styles.btnText}>Macros</Text>
        </Pressable>
        <Pressable
          style={[styles.btnAlt, useUpSoon && { backgroundColor: "black" }]}
          onPress={() => setUseUpSoon((v) => !v)}
        >
          <Text style={styles.btnText}>{useUpSoon ? "Use-up: ON" : "Use-up: OFF"}</Text>
        </Pressable>
        <Pressable style={styles.btnAlt} onPress={signOut}>
          <Text style={styles.btnText}>Sign out</Text>
        </Pressable>
      </View>

      <FlatList
        data={[...items].sort((a, b) => {
          if (!useUpSoon) return 0;
          const da = daysUntil(a.expiry_date) ?? 9999;
          const db = daysUntil(b.expiry_date) ?? 9999;
          return da - db;
        })}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Text style={{ padding: 14 }}>No items yet. Add your first ingredient.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  topRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  btn: { backgroundColor: "black", padding: 10, borderRadius: 10 },
  btnAlt: { backgroundColor: "#333", padding: 10, borderRadius: 10 },
  btnText: { color: "white", fontWeight: "800" },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#eee", marginBottom: 10 },
  name: { fontSize: 18, fontWeight: "800" },
  meta: { marginTop: 4, color: "#555" },
  badge: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#eee",
    fontWeight: "900",
  },
  badgeHot: { backgroundColor: "#ffd6d6" },
});