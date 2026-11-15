import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api";
import { useSession } from "../session";
import { accent, colors, font } from "../theme";
import { Button, Card, H1, H2, Pill } from "../ui";

type Task = { id: string; title: string; category: string; course: string | null; due_at: string | null; starts_at: string | null; sender: string };
type Suggestion = { id: string; kind: string; title: string; why: string; action: { type: string; label: string; text?: string } };

function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function Todo() {
  const { me, setMode } = useSession();
  const mode = me?.mode ?? "study";
  const a = accent(mode);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ tasks: Task[]; suggestions: Suggestion[] }>(`/todo?mode=${mode}`);
      setTasks(r.tasks); setSuggestions(r.suggestions);
    } finally { setLoading(false); }
  }, [mode]);
  useEffect(() => { load(); }, [load]);

  async function decide(sg: Suggestion, decision: "accept" | "dismiss") {
    if (decision === "accept" && sg.action.type === "copy_text" && sg.action.text) {
      await Share.share({ message: sg.action.text });
    }
    setSuggestions((prev) => prev.filter((x) => x.id !== sg.id));
    try {
      await api(`/todo/suggestions/${encodeURIComponent(sg.id)}`, { method: "POST", body: JSON.stringify({ decision }) });
      if (decision === "accept" && sg.action.type === "block_time") Alert.alert("Added to your schedule", sg.title);
    } catch { load(); }
  }

  async function done(t: Task) {
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    await api(`/items/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }).catch(() => load());
  }

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <H1>To do</H1>
        <View style={s.toggle}>
          <Pill label="Study" on={mode === "study"} onPress={() => setMode("study")} color={colors.maroon} />
          <Pill label="Work" on={mode === "work"} onPress={() => setMode("work")} color={colors.forest} />
        </View>

        {suggestions.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <H2>Suggested next steps</H2>
            {suggestions.map((sg) => (
              <Card key={sg.id} style={{ marginBottom: 10, backgroundColor: a.soft, borderColor: a.soft }}>
                <Text style={s.sgTitle}>{sg.title}</Text>
                <Text style={s.why}>{sg.why}</Text>
                <View style={s.actions}>
                  <Button small label={sg.action.label} onPress={() => decide(sg, "accept")} color={a.main} />
                  <Button small ghost label="Not now" onPress={() => decide(sg, "dismiss")} />
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ marginTop: 16 }}>
          <H2>{mode === "work" ? "Jobs, applications and housing" : "Classes and coursework"}</H2>
          {tasks.length === 0 && !loading && <Text style={s.why}>Nothing here right now.</Text>}
          {tasks.map((t) => (
            <View key={t.id} style={s.task}>
              <Pressable onPress={() => done(t)} accessibilityLabel={`Mark ${t.title} done`} style={[s.check, { borderColor: a.main }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.taskTitle}>{t.title}</Text>
                <Text style={s.meta}>{[t.course, when(t.due_at ?? t.starts_at)].filter(Boolean).join(" · ") || t.sender}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 18, paddingBottom: 40 },
  toggle: { flexDirection: "row", gap: 8, marginTop: 12 },
  sgTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  why: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  task: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.line },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  taskTitle: { fontSize: 15, color: colors.ink, fontFamily: font.semi },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
