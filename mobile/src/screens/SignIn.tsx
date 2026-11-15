import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API, api } from "../api";
import { useSession } from "../session";
import { colors, font } from "../theme";
import { Button } from "../ui";
import { Brand } from "../Brand";

export default function SignIn() {
  const { signIn } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function google() {
    setError(null);
    const res = await WebBrowser.openAuthSessionAsync(`${API}/auth/mobile/start`, "umassradar://auth");
    if (res.type !== "success") return;
    const code = new URL(res.url).searchParams.get("code");
    if (!code) return setError("Sign-in didn't finish. Try again.");
    try {
      const { token } = await api<{ token: string }>("/auth/mobile/exchange", { method: "POST", body: JSON.stringify({ code }) });
      await signIn(token);
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed."); }
  }

  async function demo() {
    setBusy(true);
    setError(null);
    try {
      const { token } = await api<{ token: string }>("/auth/mobile/demo", { method: "POST" });
      await signIn(token);
    } catch { setError(`Can't reach OneMass at ${API}.`); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={s.wrap}>
      <View style={s.center}>
        <View style={{ marginBottom: 16 }}><Brand /></View>
        <Image source={require("../../assets/sam.png")} style={s.sam} resizeMode="contain" accessibilityLabel="Sam the Minuteman" />
        <Text style={s.title}>Find every class, every room</Text>
        <Text style={s.sub}>Your schedule, to-dos and turn-by-turn directions to the right classroom, all in one place.</Text>
      </View>
      <View style={{ gap: 10 }}>
        <Button label="Sign in with your UMass Google account" onPress={google} />
        <Button label={busy ? "Loading the demo…" : "Try the demo"} onPress={demo} ghost disabled={busy} />
        {error && <Text style={s.err}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white, padding: 24, justifyContent: "space-between" },
  center: { alignItems: "center", marginTop: 40 },
  sam: { width: 200, height: 220 },
  title: { fontFamily: font.bold, fontSize: 30, letterSpacing: -0.9, textAlign: "center", color: colors.ink, marginTop: 16 },
  sub: { fontSize: 16, lineHeight: 23, textAlign: "center", color: colors.muted, marginTop: 10, maxWidth: 320 },
  err: { color: colors.maroon, textAlign: "center", marginTop: 6 },
});
