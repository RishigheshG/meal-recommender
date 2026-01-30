import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert, Pressable } from "react-native";
import { supabase } from "../lib/supabase";
import { matchRecipes, getNutrition } from "../lib/api";
import { PantryItem } from "../types/pantry";
import { daysUntil } from "../utils/expiry";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../nav/AppNavigator";

type RecipeCard = {
  id: string;
  title: string;
  image?: string | null;
  used_ingredients: string[];
  missing_ingredients: string[];
  match_score: number;
  ready_in_minutes?: number | null;
  source: string;
};

type Props = NativeStackScreenProps<RootStackParamList, "Cook">;

export default function CookScreen({ navigation }: Props) {
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [useUpSoonOnly, setUseUpSoonOnly] = useState(false);
  const [pantrySnapshot, setPantrySnapshot] = useState<PantryItem[]>([]);

  const load = async () => {
    try {
      setLoading(true);

      const { data: items, error } = await supabase.from("pantry_items").select("*");
      if (error) throw error;

      const pantry = (items ?? []) as PantryItem[];
      setPantrySnapshot(pantry);
      if (pantry.length === 0) {
        setRecipes([]);
        return;
      }

      const payload = {
        items: pantry.map((p) => ({
          name: p.display_name,
          quantity: p.quantity,
          unit: p.unit,
          expiry_date: p.expiry_date,
          location: p.location,
        })),
        max_missing: 2,
      };

      const res = await matchRecipes(payload);
      setRecipes(res.recipes ?? []);
    } catch (e: any) {
      Alert.alert("Cook failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addMissingToShoppingList = async (missing: string[]) => {
    const cleaned = (missing ?? []).map((x) => String(x).trim()).filter(Boolean);
    if (cleaned.length === 0) return Alert.alert("Nothing to add", "This recipe has no missing ingredients.");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not logged in");

      const rows = cleaned.map((name) => ({
        user_id: uid,
        name,
        quantity: null,
        unit: null,
        checked: false,
      }));

      const { error } = await supabase.from("shopping_list_items").insert(rows);
      if (error) throw error;

      Alert.alert("Added", `Added ${rows.length} item(s) to your shopping list.`);
    } catch (e: any) {
      Alert.alert("Add failed", e.message ?? "Unknown error");
    }
  };

  const cookNow = async (recipe: RecipeCard) => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not logged in");

      const n = await getNutrition(String(recipe.id));

      const { error } = await supabase.from("cooked_meals").insert({
        user_id: uid,
        recipe_id: String(recipe.id),
        title: recipe.title,
        calories: n.calories ?? null,
        protein_g: n.protein_g ?? null,
        carbs_g: n.carbs_g ?? null,
        fat_g: n.fat_g ?? null,
      });

      if (error) throw error;

      Alert.alert("Logged", "Meal logged to Macros.");
    } catch (e: any) {
      Alert.alert("Cook now failed", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: RecipeCard }) => {
    const missing = item.missing_ingredients?.length ?? 0;
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          Missing: {missing} • Used: {item.used_ingredients?.length ?? 0} • Score: {Math.round(item.match_score)}
        </Text>
        {missing > 0 && (
          <Text style={styles.missing}>Missing: {item.missing_ingredients.join(", ")}</Text>
        )}
        <View style={styles.cardActions}>
          <Pressable style={styles.smallBtn} onPress={() => addMissingToShoppingList(item.missing_ingredients ?? [])}>
            <Text style={styles.smallBtnText}>Add missing</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => cookNow(item)}>
            <Text style={styles.smallBtnText}>Cook now</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable style={styles.btn} onPress={load} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Loading..." : "Refresh recipes"}</Text>
        </Pressable>

        <Pressable style={styles.btnAlt} onPress={() => setUseUpSoonOnly((v) => !v)}>
          <Text style={styles.btnText}>{useUpSoonOnly ? "Use-up: ON" : "Use-up: OFF"}</Text>
        </Pressable>

        <Pressable style={styles.btnAlt} onPress={() => navigation.navigate("ShoppingList")}>
          <Text style={styles.btnText}>List</Text>
        </Pressable>
      </View>

      <FlatList
        data={recipes.filter((r) => {
          if (!useUpSoonOnly) return true;
          const expiring = new Set(
            pantrySnapshot
              .filter((p) => (daysUntil(p.expiry_date) ?? 9999) <= 5)
              .map((p) => p.display_name.trim().toLowerCase())
          );
          return (r.used_ingredients ?? []).some((u) => expiring.has(String(u).toLowerCase()));
        })}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ padding: 14 }}>
            {loading ? "Loading..." : "No recipes found. Add more pantry items."}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  topRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  btn: { backgroundColor: "black", padding: 12, borderRadius: 12, alignItems: "center" },
  btnAlt: { backgroundColor: "#333", padding: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "900" },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#eee", marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "900" },
  meta: { marginTop: 6, color: "#555" },
  missing: { marginTop: 6, color: "#7a1f1f", fontWeight: "700" },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  smallBtn: { backgroundColor: "black", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  smallBtnText: { color: "white", fontWeight: "900" },
});