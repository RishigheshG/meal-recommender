

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type ShoppingItem = {
  id: string;
  user_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  created_at: string;
};

export default function ShoppingListScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shopping_list_items")
        .select("*")
        .order("checked", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as ShoppingItem[]);
    } catch (e: any) {
      Alert.alert("Load failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const total = items.length;
    const checked = items.filter((x) => x.checked).length;
    return { total, checked, remaining: total - checked };
  }, [items]);

  const addItem = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Missing", "Enter an item name.");

    const q = quantity.trim() ? Number(quantity) : null;
    if (quantity.trim() && (!Number.isFinite(q) || (q as number) <= 0)) {
      return Alert.alert("Invalid", "Quantity must be a positive number.");
    }

    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not logged in");

      const { error } = await supabase.from("shopping_list_items").insert({
        user_id: uid,
        name: trimmed,
        quantity: q,
        unit: q ? unit : null,
        checked: false,
      });
      if (error) throw error;

      setName("");
      setQuantity("");
      setUnit("pcs");
      await load();
    } catch (e: any) {
      Alert.alert("Add failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const toggleChecked = async (item: ShoppingItem) => {
    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ checked: !item.checked })
        .eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, checked: !x.checked } : x)));
    } catch (e: any) {
      Alert.alert("Update failed", e.message ?? "Unknown error");
    }
  };

  const deleteChecked = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not logged in");

      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("user_id", uid)
        .eq("checked", true);
      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert("Delete failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not logged in");

      const { error } = await supabase.from("shopping_list_items").delete().eq("user_id", uid);
      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert("Clear failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const qty = item.quantity ? `${item.quantity} ${item.unit ?? ""}`.trim() : "";
    return (
      <Pressable style={styles.row} onPress={() => toggleChecked(item)}>
        <View style={[styles.checkbox, item.checked && styles.checkboxOn]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>{item.name}</Text>
          {!!qty && <Text style={styles.itemMeta}>{qty}</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Shopping List</Text>
      <Text style={styles.subheader}>
        Remaining {counts.remaining} • Checked {counts.checked} • Total {counts.total}
      </Text>

      <View style={styles.addBox}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Add item (e.g., tomatoes)"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { width: 90 }]}
          placeholder="Qty"
          keyboardType="decimal-pad"
          value={quantity}
          onChangeText={setQuantity}
        />
        <TextInput
          style={[styles.input, { width: 70 }]}
          placeholder="Unit"
          value={unit}
          onChangeText={setUnit}
        />
        <Pressable style={styles.btn} disabled={loading} onPress={addItem}>
          <Text style={styles.btnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btnAlt} disabled={loading} onPress={deleteChecked}>
          <Text style={styles.btnText}>Delete checked</Text>
        </Pressable>
        <Pressable
          style={[styles.btnAlt, { backgroundColor: "#7a1f1f" }]}
          disabled={loading}
          onPress={clearAll}
        >
          <Text style={styles.btnText}>Clear all</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={{ padding: 14 }}>{loading ? "Loading..." : "No items yet."}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  header: { fontSize: 22, fontWeight: "900" },
  subheader: { marginTop: 4, marginBottom: 10, color: "#555" },

  addBox: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 10 },

  actions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  btn: { backgroundColor: "black", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnAlt: { backgroundColor: "#333", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { color: "white", fontWeight: "900" },

  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 10,
  },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: "#333" },
  checkboxOn: { backgroundColor: "black", borderColor: "black" },
  itemName: { fontSize: 16, fontWeight: "900" },
  itemNameChecked: { textDecorationLine: "line-through", color: "#777" },
  itemMeta: { marginTop: 3, color: "#555" },
});