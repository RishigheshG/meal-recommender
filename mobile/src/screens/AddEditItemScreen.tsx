import React, { useEffect, useMemo, useState } from "react";
import { Alert, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../nav/AppNavigator";
import { supabase } from "../lib/supabase";
import { normalizeName } from "../utils/normalize";

type Props = NativeStackScreenProps<RootStackParamList, "AddEditItem">;

const UNITS = ["pcs", "g", "kg", "ml", "l", "tbsp", "tsp"];
const LOCS = ["pantry", "fridge", "freezer"];

export default function AddEditItemScreen({ route, navigation }: Props) {
  const id = route.params?.id;
  const barcode = route.params?.barcode as string | undefined;
  const prefillName = route.params?.prefillName as string | undefined;
  const prefillQuantity = route.params?.prefillQuantity as number | undefined;
  const prefillUnit = route.params?.prefillUnit as string | undefined;
  const isEdit = useMemo(() => Boolean(id), [id]);

  const [displayName, setDisplayName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [location, setLocation] = useState("pantry");
  const [expiryDate, setExpiryDate] = useState(""); // YYYY-MM-DD
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setBusy(true);
        const { data, error } = await supabase.from("pantry_items").select("*").eq("id", id).single();
        if (error) throw error;

        setDisplayName(data.display_name ?? "");
        setQuantity(String(data.quantity ?? 1));
        setUnit(data.unit ?? "pcs");
        setLocation(data.location ?? "pantry");
        setExpiryDate(data.expiry_date ?? "");
      } catch (e: any) {
        Alert.alert("Load item failed", e.message ?? "Unknown error");
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (id) return; // don't prefill when editing
    if (prefillName) setDisplayName(prefillName);
    if (prefillQuantity) setQuantity(String(prefillQuantity));
    if (prefillUnit) setUnit(prefillUnit);
  }, [id, prefillName, prefillQuantity, prefillUnit]);

  const save = async () => {
    const q = Number(quantity);
    if (!displayName.trim()) return Alert.alert("Missing", "Enter ingredient name.");
    if (!Number.isFinite(q) || q <= 0) return Alert.alert("Invalid", "Quantity must be a positive number.");

    const canonical = normalizeName(displayName);

    try {
      setBusy(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not logged in");

      if (!isEdit) {
        const { error } = await supabase.from("pantry_items").insert({
          user_id: uid,
          canonical_name: canonical,
          display_name: displayName.trim(),
          quantity: q,
          unit,
          location,
          expiry_date: expiryDate ? expiryDate : null,
          barcode: barcode ?? null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pantry_items")
          .update({
            canonical_name: canonical,
            display_name: displayName.trim(),
            quantity: q,
            unit,
            location,
            expiry_date: expiryDate ? expiryDate : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Save failed", e.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!id) return;
    try {
      setBusy(true);
      const { error } = await supabase.from("pantry_items").delete().eq("id", id);
      if (error) throw error;
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Delete failed", e.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ingredient</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="e.g., Chicken breast" />

      {barcode && (
        <>
          <Text style={styles.label}>Barcode</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#f2f2f2" }]}
            value={barcode}
            editable={false}
          />
        </>
      )}

      <Text style={styles.label}>Quantity</Text>
      <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="e.g., 500" />

      <Text style={styles.label}>Unit</Text>
      <View style={styles.row}>
        {UNITS.map((u) => (
          <Pressable key={u} onPress={() => setUnit(u)} style={[styles.pill, unit === u && styles.pillActive]}>
            <Text style={[styles.pillText, unit === u && styles.pillTextActive]}>{u}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Location</Text>
      <View style={styles.row}>
        {LOCS.map((l) => (
          <Pressable key={l} onPress={() => setLocation(l)} style={[styles.pill, location === l && styles.pillActive]}>
            <Text style={[styles.pillText, location === l && styles.pillTextActive]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Expiry date (optional, YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={expiryDate} onChangeText={setExpiryDate} placeholder="2026-01-31" />

      <Pressable style={styles.btn} disabled={busy} onPress={save}>
        <Text style={styles.btnText}>{busy ? "..." : "Save"}</Text>
      </Pressable>

      {isEdit && (
        <Pressable style={[styles.btn, styles.btnDanger]} disabled={busy} onPress={del}>
          <Text style={styles.btnText}>{busy ? "..." : "Delete"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, gap: 10 },
  label: { fontWeight: "800", marginTop: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { borderWidth: 1, borderColor: "#ddd", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  pillActive: { backgroundColor: "black", borderColor: "black" },
  pillText: { color: "#333", fontWeight: "800" },
  pillTextActive: { color: "white" },
  btn: { backgroundColor: "black", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  btnDanger: { backgroundColor: "#7a1f1f" },
  btnText: { color: "white", fontWeight: "900" },
});