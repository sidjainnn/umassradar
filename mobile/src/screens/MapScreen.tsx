import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import MapView, { Marker, Polygon, Polyline, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type ClassWhere, type IndoorBuilding, type LatLon, type Outline, type Route } from "../api";
import { useSession } from "../session";
import { accent, colors, font } from "../theme";
import { Pill } from "../ui";

const CAMPUS: Region = { latitude: 42.3897, longitude: -72.5268, latitudeDelta: 0.012, longitudeDelta: 0.012 };
const pt = ([lat, lon]: LatLon) => ({ latitude: lat, longitude: lon });

function centroid(poly: LatLon[]): LatLon {
  const n = poly.length || 1;
  return [poly.reduce((a, p) => a + p[0], 0) / n, poly.reduce((a, p) => a + p[1], 0) / n];
}

function regionFor(poly: LatLon[], pad = 1.8): Region {
  const lats = poly.map((p) => p[0]);
  const lons = poly.map((p) => p[1]);
  const [lat0, lat1, lon0, lon1] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  return { latitude: (lat0 + lat1) / 2, longitude: (lon0 + lon1) / 2,
    latitudeDelta: Math.max(0.0012, (lat1 - lat0) * pad), longitudeDelta: Math.max(0.0012, (lon1 - lon0) * pad) };
}

type Locate = { building: { name: string; center: LatLon; outline: LatLon[] }; room: string | null; steps: string[] };

export default function MapScreen() {
  const { me, target, setTarget } = useSession();
  const a = accent(me?.mode);
  const map = useRef<MapView>(null);
  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [classes, setClasses] = useState<ClassWhere[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [indoor, setIndoor] = useState<IndoorBuilding | null>(null);
  const [outdoor, setOutdoor] = useState<Locate | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [accessible, setAccessible] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [showMe, setShowMe] = useState(false);

  useEffect(() => {
    api<Outline[]>("/rooms/buildings").then(setOutlines).catch(() => {});
    api<{ classes: ClassWhere[] }>("/schedule/where").then((r) => setClasses(r.classes)).catch(() => {});
  }, []);

  const classBuildings = useMemo(() => new Set(classes.filter((c) => c.location.found).map((c) => c.location.building)), [classes]);

  const find = useCallback(async (text: string, stepFree = accessible) => {
    const query = text.trim();
    if (!query) return;
    Keyboard.dismiss();
    setBusy(true); setError(null);
    // "my STAT class" or "stat 315" -> that class's room
    const mine = classes.find((c) => c.location.found && query.toLowerCase().replace(/\s+/g, "").includes(c.course.toLowerCase().replace(/\s+/g, "").slice(0, Math.max(4, c.course.length - 4))));
    const to = /\d/.test(query) || !mine ? query : mine.location.raw ?? query;
    try {
      const r = await api<Route>(`/indoor/route?to=${encodeURIComponent(to)}&accessible=${stepFree}`);
      const b = await api<IndoorBuilding>(`/indoor/${encodeURIComponent(to)}`);
      setRoute(r); setIndoor(b); setOutdoor(null); setFloor(r.floor);
      map.current?.animateToRegion(regionFor(b.floors.flatMap((f) => f.rooms.flatMap((x) => x.polygon)), 1.3), 600);
    } catch (e) {
      // not a classroom we have inside: show the building and how to get to it
      try {
        const loc = await api<Locate>(`/rooms/locate?q=${encodeURIComponent(to)}`);
        setOutdoor(loc); setRoute(null); setIndoor(null);
        map.current?.animateToRegion(regionFor(loc.building.outline.length ? loc.building.outline : [loc.building.center]), 600);
      } catch {
        const byName = outlines.find((o) => o.name.toLowerCase().includes(query.toLowerCase()));
        if (byName) {
          setOutdoor({ building: byName, room: null, steps: [] }); setRoute(null); setIndoor(null);
          map.current?.animateToRegion(regionFor(byName.outline), 600);
        } else {
          setError(e instanceof ApiError ? e.message : "Couldn't find that. Try a room like ILC S220.");
        }
      }
    } finally { setBusy(false); }
  }, [accessible, classes, outlines]);

  // opened from Home ("Navigate") or Ask Sam
  useEffect(() => {
    if (target) { setQ(target); find(target); setTarget(null); }
  }, [target, find, setTarget]);

  async function locate() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return setError("Location is off. You can still search for any room.");
    setShowMe(true);
    const here = await Location.getCurrentPositionAsync({});
    map.current?.animateToRegion({ latitude: here.coords.latitude, longitude: here.coords.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 600);
  }

  function clear() { setRoute(null); setIndoor(null); setOutdoor(null); setQ(""); setError(null); setFloor(null); }

  const shownFloor = indoor?.floors.find((f) => f.level === floor);
  const leg = route?.legs.find((l) => l.level === floor);
  const approximate = shownFloor?.source === "generated";

  return (
    <View style={s.wrap}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={CAMPUS}
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
        showsPointsOfInterests={false}
        showsBuildings={false}
        showsUserLocation={showMe}
        toolbarEnabled={false}
        onRegionChangeComplete={(r) => setZoomedIn(r.latitudeDelta < 0.0022)}
      >
        {outlines.map((o) => o.outline.length > 2 && (
          <Polygon key={o.id} coordinates={o.outline.map(pt)} tappable
            onPress={() => { setQ(o.name); find(o.name); }}
            fillColor={classBuildings.has(o.name) ? a.soft : "rgba(225,228,229,0.55)"}
            strokeColor={classBuildings.has(o.name) ? a.main : "#c9cdcf"} strokeWidth={classBuildings.has(o.name) ? 1.5 : 1} />
        ))}
        {shownFloor?.rooms.map((r) => (
          <Polygon key={r.code} coordinates={r.polygon.map(pt)} zIndex={5}
            fillColor={route && r.code === route.code ? a.main : "rgba(255,255,255,0.92)"}
            strokeColor={route && r.code === route.code ? a.main : "#9aa1a4"} strokeWidth={1} />
        ))}
        {zoomedIn && shownFloor?.rooms.map((r) => {
          const [lat, lon] = centroid(r.polygon);
          return (
            <Marker key={`l${r.code}`} coordinate={{ latitude: lat, longitude: lon }} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
              <Text style={[s.roomLabel, route && r.code === route.code && { color: colors.white }]}>{r.room}</Text>
            </Marker>
          );
        })}
        {leg && leg.line.length > 1 && (
          <Polyline coordinates={leg.line.map(pt)} strokeColor={colors.ink} strokeWidth={4} lineDashPattern={[6, 6]} zIndex={6} />
        )}
        {route && floor === route.entrance.level && (
          <Marker coordinate={pt(route.entrance.at)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={[s.door, { borderColor: a.main }]} />
          </Marker>
        )}
      </MapView>

      <SafeAreaView edges={["top"]} pointerEvents="box-none">
        <View style={s.search}>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => find(q)} returnKeyType="search"
            placeholder="Find a room or building, e.g. ILC S220" placeholderTextColor={colors.muted}
            style={s.input} autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Find a room or building" />
          {busy ? <ActivityIndicator color={a.main} /> : q ? (
            <Pressable onPress={clear} accessibilityLabel="Clear"><Text style={s.clear}>Clear</Text></Pressable>
          ) : null}
        </View>
        {classes.length > 0 && !route && !outdoor && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {classes.filter((c) => c.location.found).map((c, i) => (
              <Pill key={`${c.course}${i}`} label={`${c.course} · ${c.location.room ?? c.location.building}`} on={false}
                onPress={() => { setQ(c.location.raw ?? ""); find(c.location.raw ?? ""); }} />
            ))}
          </ScrollView>
        )}
        {error && <Text style={s.error}>{error}</Text>}
      </SafeAreaView>

      {!route && !outdoor && (
        <Pressable onPress={locate} style={s.locate} accessibilityLabel="Show where I am">
          <View style={[s.locateDot, { backgroundColor: a.main }]} />
        </Pressable>
      )}

      {route && (
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{route.room}</Text>
          <Text style={s.sheetSub}>{route.building} · floor {route.floor} · about {route.minutes} min inside</Text>
          {indoor && indoor.floors.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
              {indoor.floors.map((f) => (
                <Pill key={f.level} label={f.level === 0 ? "LL" : String(f.level)} on={f.level === floor} onPress={() => setFloor(f.level)} color={a.main} />
              ))}
            </ScrollView>
          )}
          {route.steps.map((st, i) => (
            <View key={i} style={s.step}>
              <Text style={[s.stepNum, { color: a.main }]}>{i + 1}</Text>
              <Text style={s.stepText}>{st}</Text>
            </View>
          ))}
          <View style={s.access}>
            <Text style={s.accessText}>Step-free (elevators only)</Text>
            <Switch value={accessible} onValueChange={(v) => { setAccessible(v); find(q, v); }} trackColor={{ true: a.main, false: colors.line }} />
          </View>
          {approximate && <Text style={s.note}>Approximate layout for this floor, based on the official room list.</Text>}
        </View>
      )}

      {outdoor && !route && (
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>{outdoor.room ? `${outdoor.room}` : outdoor.building.name}</Text>
          <Text style={s.sheetSub}>{outdoor.building.name}</Text>
          {outdoor.steps.slice(0, 4).map((st, i) => (
            <View key={i} style={s.step}>
              <Text style={[s.stepNum, { color: a.main }]}>{i + 1}</Text>
              <Text style={s.stepText}>{st}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.paper },
  search: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 8, backgroundColor: colors.white,
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: Platform.OS === "ios" ? 13 : 6,
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  input: { flex: 1, fontSize: 16, color: colors.ink },
  clear: { color: colors.muted, fontFamily: font.semi },
  chips: { gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  error: { marginHorizontal: 14, marginTop: 8, backgroundColor: colors.white, padding: 10, borderRadius: 12, color: colors.inkSoft, overflow: "hidden" },
  roomLabel: { fontSize: 11, fontFamily: font.semi, color: colors.inkSoft },
  door: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.white, borderWidth: 3 },
  locate: { position: "absolute", right: 16, bottom: 24, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  locateDot: { width: 14, height: 14, borderRadius: 7 },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 28, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, elevation: 8, maxHeight: "55%" },
  sheetTitle: { fontFamily: font.bold, fontSize: 26, letterSpacing: -0.6, color: colors.ink },
  sheetSub: { color: colors.muted, fontSize: 15, marginTop: 2 },
  step: { flexDirection: "row", gap: 10, marginTop: 8 },
  stepNum: { fontFamily: font.bold, fontSize: 15, width: 18 },
  stepText: { flex: 1, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  access: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  accessText: { fontSize: 15, color: colors.ink, fontFamily: font.semi },
  note: { color: colors.muted, fontSize: 12, marginTop: 10 },
});
