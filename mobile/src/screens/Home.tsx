import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type ClassWhere } from "../api";
import { useSession } from "../session";
import { accent, colors, font } from "../theme";
import { Button, Card, H1, H2 } from "../ui";
import { Brand } from "../Brand";

type Brief = { sentences: { text: string }[] };
type Progress = { done: number; total: number; streak: number; countdowns: { course: string | null; title: string; days: number }[] };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function clock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

export default function Home() {
  const { me, setTarget } = useSession();
  const nav = useNavigation<any>();
  const a = accent(me?.mode);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [classes, setClasses] = useState<ClassWhere[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, p, w] = await Promise.all([
      api<Brief>("/brief").catch(() => null),
      api<Progress>("/progress").catch(() => null),
      api<{ classes: ClassWhere[] }>("/schedule/where").catch(() => ({ classes: [] })),
    ]);
    setBrief(b); setProgress(p); setClasses(w.classes); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load, me?.mode]);

  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = classes.filter((c) => c.today);
  const next = today.find((c) => { const [h, m] = c.end.split(":").map(Number); return h * 60 + m > minutes; }) ?? classes[0];
  const name = me?.demo ? "" : (me?.profile?.preferred_name || me?.name?.split(" ")[0] || "");
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  function go(to: string) { setTarget(to); nav.navigate("Map"); }

  return (
    <SafeAreaView style={s.wrap} edges={["top"]}>
      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <View style={{ marginBottom: 12 }}><Brand color={a.main} size={28} /></View>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Text style={s.date}>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}{me?.mode === "work" ? " · Work mode" : ""}</Text>
            <H1>{greeting()}{name ? `, ${name}` : ""}.</H1>
          </View>
          <Image source={require("../../assets/sam.png")} style={s.sam} resizeMode="contain" accessibilityLabel="Sam the Minuteman" />
        </View>

        {brief?.sentences?.length ? (
          <Text style={[s.brief, { borderColor: a.main }]}>{brief.sentences.map((x) => x.text).join(" ")}</Text>
        ) : null}

        {next && (
          <Card style={{ marginTop: 20 }}>
            <Text style={s.label}>{next.today ? "Next class" : "Your classes"}</Text>
            <Text style={s.big}>{next.course} {next.component ? `· ${next.component}` : ""}</Text>
            <Text style={s.meta}>{next.today ? "Today" : next.day_names.join(", ")} {clock(next.start)} to {clock(next.end)}</Text>
            <Text style={s.where}>{next.location.found ? next.location.summary : `Room not on the map (${next.location.raw ?? "no room"})`}</Text>
            {next.walk_from_previous && (
              <Text style={s.meta}>{next.walk_from_previous.minutes} min walk from {next.walk_from_previous.from}
                {next.walk_from_previous.tight ? " · that's tight" : ""}</Text>
            )}
            {next.location.found && next.location.navigate && (
              <View style={{ marginTop: 12 }}><Button label="Navigate" onPress={() => go(next.location.navigate!.to)} color={a.main} /></View>
            )}
          </Card>
        )}

        <View style={s.row}>
          <Card style={{ flex: 1 }}>
            <Text style={s.label}>This week</Text>
            <Text style={s.big}>{pct}%</Text>
            <Text style={s.meta}>{progress ? `${progress.done} of ${progress.total} deadlines done` : "…"}</Text>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={s.label}>Streak</Text>
            <Text style={s.big}>{progress?.streak ?? 0} wk</Text>
            <Text style={s.meta}>weeks at 80% or more</Text>
          </Card>
        </View>

        {!!progress?.countdowns?.length && (
          <View style={{ marginTop: 20 }}>
            <H2>Coming up</H2>
            {progress.countdowns.slice(0, 4).map((c) => (
              <Text key={c.title + c.days} style={s.count}>
                <Text style={{ fontFamily: font.bold, color: c.days <= 3 ? a.main : colors.ink }}>{c.days === 0 ? "Today" : `${c.days}d`}  </Text>
                {c.course ? `${c.course} ` : ""}{c.title}
              </Text>
            ))}
          </View>
        )}

        {classes.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <H2>Where your classes are</H2>
            {classes.map((c, i) => (
              <Card key={`${c.course}${c.start}${i}`} style={{ marginBottom: 8, padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.course}>{c.course} <Text style={s.meta}>{c.day_names.join(" ")} {clock(c.start)}</Text></Text>
                    <Text style={s.meta}>{c.location.found ? c.location.summary : "Not on the map"}</Text>
                  </View>
                  {c.location.found && <Button small label="Go" onPress={() => go(c.location.navigate!.to)} color={a.main} />}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.paper },
  body: { padding: 18, paddingBottom: 40 },
  head: { flexDirection: "row", alignItems: "flex-end" },
  date: { color: colors.muted, fontSize: 14, marginBottom: 2 },
  sam: { width: 78, height: 88 },
  brief: { marginTop: 18, borderLeftWidth: 3, paddingLeft: 12, fontSize: 16, lineHeight: 24, color: colors.inkSoft },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  label: { color: colors.muted, fontSize: 13, fontFamily: font.semi },
  big: { fontFamily: font.bold, fontSize: 24, color: colors.ink, marginTop: 2, letterSpacing: -0.5 },
  meta: { color: colors.muted, fontSize: 14, marginTop: 2 },
  where: { color: colors.ink, fontSize: 15, marginTop: 6, fontFamily: font.semi },
  count: { fontSize: 15, color: colors.inkSoft, marginBottom: 6 },
  course: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
});
