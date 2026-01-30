import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";
import { API_BASE } from "../lib/api";

// super simple parser (good enough for MVP)
function wordNumberToInt(w: string): number | null {
  const map: Record<string, number> = {
    a: 1, an: 1,
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  };
  return map[w] ?? null;
}

function cleanText(s: string) {
  return s
    .toLowerCase()
    .replace(/[.?!]/g, "")      // remove trailing punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function parseToItems(text: string) {
  const knownUnits = new Set(["pcs", "pc", "g", "kg", "ml", "l", "tbsp", "tsp"]);

  const parts = cleanText(text)
    .replace(/^add\s+/, "")
    .split(/,| and /g)
    .map((x) => x.trim())
    .filter(Boolean);

  return parts.map((p) => {
    const tokens = p.split(" ").filter(Boolean);

    if (tokens.length === 0) return { name: p, quantity: 1, unit: "pcs" };

    // 1) quantity (digit OR number-word)
    let qty: number | null = null;
    const first = tokens[0];

    if (/^\d+(\.\d+)?$/.test(first)) qty = Number(first);
    else qty = wordNumberToInt(first);

    let idx = qty !== null ? 1 : 0;

    // 2) unit ONLY if it matches known unit tokens
    let unit = "pcs";
    if (idx < tokens.length) {
      const maybeUnit = tokens[idx];
      if (knownUnits.has(maybeUnit)) {
        unit = maybeUnit === "pc" ? "pcs" : maybeUnit;
        idx += 1;
      }
    }

    // 3) remaining tokens = ingredient name
    const name = tokens.slice(idx).join(" ").trim() || p;

    return {
      name,
      quantity: qty !== null && Number.isFinite(qty) ? qty : 1,
      unit,
    };
  });
}

export default function VoiceAddScreen({ navigation }: any) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert("Permission needed", "Microphone permission is required.");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const start = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setText("");
    } catch (e: any) {
      Alert.alert("Start failed", e.message ?? "Unknown error");
    }
  };

  const stopAndTranscribe = async () => {
    try {
      setBusy(true);

      // The recording will be available on `audioRecorder.uri` after stop.
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error("No audio file URI");

      const form = new FormData();
      form.append(
        "file",
        {
          uri,
          name: "voice.m4a",
          type: "audio/m4a",
        } as any
      );

      const res = await fetch(`${API_BASE}/stt`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      const t = String(json.text ?? "").trim();
      setText(t);

      const items = parseToItems(t);
      if (items.length === 0) return;

      const first = items[0];
      navigation.replace("AddEditItem", {
        prefillName: first.name,
        prefillQuantity: first.quantity,
        prefillUnit: first.unit,
      });
    } catch (e: any) {
      Alert.alert("Transcription failed", e.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Add</Text>
      <Text style={styles.hint}>Say something like: “add 2 eggs and 500 ml milk”.</Text>

      <Pressable style={styles.btn} disabled={busy || recorderState.isRecording} onPress={start}>
        <Text style={styles.btnText}>{recorderState.isRecording ? "Recording..." : "Start recording"}</Text>
      </Pressable>

      <Pressable style={styles.btnAlt} disabled={busy || !recorderState.isRecording} onPress={stopAndTranscribe}>
        <Text style={styles.btnText}>Stop & transcribe</Text>
      </Pressable>

      {!!text && (
        <View style={styles.box}>
          <Text style={{ fontWeight: "900" }}>Transcript</Text>
          <Text>{text}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, gap: 10 },
  title: { fontSize: 22, fontWeight: "900" },
  hint: { color: "#555" },
  btn: { backgroundColor: "black", padding: 12, borderRadius: 12, alignItems: "center" },
  btnAlt: { backgroundColor: "#333", padding: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "900" },
  box: { marginTop: 10, borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, gap: 6 },
});