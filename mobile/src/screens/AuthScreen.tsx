import React, { useState } from "react";
import { Alert, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Sign in failed", e.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      Alert.alert("Check your email", "Confirm your email to complete signup.");
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MealCraft</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.btn} disabled={busy} onPress={signIn}>
        <Text style={styles.btnText}>{busy ? "..." : "Sign In"}</Text>
      </Pressable>

      <Pressable style={[styles.btn, styles.btnAlt]} disabled={busy} onPress={signUp}>
        <Text style={styles.btnText}>{busy ? "..." : "Create Account"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", gap: 12 },
  title: { fontSize: 34, fontWeight: "700", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 12, borderRadius: 10 },
  btn: { backgroundColor: "black", padding: 12, borderRadius: 10, alignItems: "center" },
  btnAlt: { backgroundColor: "#333" },
  btnText: { color: "white", fontWeight: "600" },
});