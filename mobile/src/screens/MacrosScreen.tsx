import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

type Meal = {
  id: string;
  title: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  cooked_at: string;
};

function startOfTodayISO() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d.toISOString();
}

export default function MacrosScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const since = startOfTodayISO();
      const { data, error } = await supabase
        .from("cooked_meals")
        .select("*")
        .gte("cooked_at", since)
        .order("cooked_at", { ascending: false });

      if (error) throw error;
      setMeals((data ?? []) as Meal[]);
    } catch (e: any) {
      Alert.alert("Load failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const sum = (k: keyof Meal) => meals.reduce((a, m) => a + (Number(m[k]) || 0), 0);
    return {
      calories: sum("calories"),
      protein: sum("protein_g"),
      carbs: sum("carbs_g"),
      fat: sum("fat_g"),
    };
  }, [meals]);

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.h1}>Today</Text>
        <Text style={styles.big}>{Math.round(totals.calories)} kcal</Text>
        <Text style={styles.row}>Protein: {Math.round(totals.protein)} g</Text>
        <Text style={styles.row}>Carbs: {Math.round(totals.carbs)} g</Text>
        <Text style={styles.row}>Fat: {Math.round(totals.fat)} g</Text>

        <Pressable style={styles.btn} onPress={load} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "..." : "Refresh"}</Text>
        </Pressable>
      </View>

      <FlatList
        data={meals}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {Math.round(Number(item.calories) || 0)} kcal • P {Math.round(Number(item.protein_g) || 0)} • C{" "}
              {Math.round(Number(item.carbs_g) || 0)} • F {Math.round(Number(item.fat_g) || 0)}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ padding: 14 }}>{loading ? "Loading..." : "No logged meals today."}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  summary: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#eee", marginBottom: 10, gap: 6 },
  h1: { fontSize: 20, fontWeight: "900" },
  big: { fontSize: 26, fontWeight: "900" },
  row: { color: "#333", fontWeight: "700" },
  btn: { backgroundColor: "black", padding: 10, borderRadius: 10, alignItems: "center", marginTop: 8 },
  btnText: { color: "white", fontWeight: "900" },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#eee", marginBottom: 10 },
  title: { fontWeight: "900" },
  meta: { marginTop: 6, color: "#555" },
});