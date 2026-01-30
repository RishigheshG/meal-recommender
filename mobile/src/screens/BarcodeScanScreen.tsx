import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { supabase } from "../lib/supabase";

async function lookupOpenFoodFacts(barcode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const name =
      data?.product?.product_name ||
      data?.product?.product_name_en ||
      data?.product?.brands;
    if (!name) return null;
    return String(name).trim();
  } catch {
    return null;
  }
}

export default function BarcodeScanScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!permission) return;
      if (!permission.granted) await requestPermission();
    })();
  }, [permission, requestPermission]);

  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (busy) return;
    if (scannedRef.current) return;

    const barcode = result.data?.trim();
    if (!barcode) return;

    scannedRef.current = true;
    setBusy(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not logged in");

      // 1) If barcode already exists, increment quantity (simple default: +1 pcs)
      const { data: existing, error: findErr } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("user_id", uid)
        .eq("barcode", barcode)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing?.id) {
        const newQty = Number(existing.quantity ?? 1) + 1;
        const { error: updErr } = await supabase
          .from("pantry_items")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (updErr) throw updErr;

        Alert.alert("Updated", `Added +1 to ${existing.display_name} (barcode: ${barcode})`);
        navigation.goBack();
        return;
      }

      // 2) Else, try auto-fill product name
      const guessedName = await lookupOpenFoodFacts(barcode);

      // 3) Go to Add/Edit with prefilled barcode + name
      navigation.replace("AddEditItem", {
        barcode,
        prefillName: guessedName ?? "",
        prefillQuantity: 1,
        prefillUnit: "pcs",
      });
    } catch (e: any) {
      Alert.alert("Scan failed", e.message ?? "Unknown error");
      scannedRef.current = false;
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 10 }}>Camera permission is required to scan barcodes.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{
          // common formats; you can broaden later
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
        }}
        onBarcodeScanned={onBarcodeScanned}
      />

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          Point at a barcode… {busy ? "\nProcessing…" : ""}
        </Text>

        <Pressable
          style={[styles.btn, { backgroundColor: "#333" }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.btnText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={styles.btn}
          onPress={() => {
            scannedRef.current = false;
            setBusy(false);
            Alert.alert("Ready", "Scan reset. You can scan again.");
          }}
        >
          <Text style={styles.btnText}>Scan again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 20, justifyContent: "center", alignItems: "center" },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  overlayText: { color: "white", fontWeight: "900", fontSize: 16 },
  btn: { backgroundColor: "black", padding: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "900" },
});