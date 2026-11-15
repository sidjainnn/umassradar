import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, font } from "./theme";

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={s.h2}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ label, onPress, color = colors.maroon, ghost = false, small = false, disabled = false }: {
  label: string; onPress: () => void; color?: string; ghost?: boolean; small?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.btn, small && s.btnSmall, ghost ? { backgroundColor: colors.paper } : { backgroundColor: color },
        (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[s.btnText, small && { fontSize: 14 }, ghost && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, on, onPress, color = colors.maroon }: { label: string; on: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[s.pill, on ? { backgroundColor: color } : { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1 }]}>
      <Text style={[s.pillText, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  h1: { fontFamily: font.bold, fontSize: 30, letterSpacing: -0.8, color: colors.ink },
  h2: { fontFamily: font.bold, fontSize: 19, letterSpacing: -0.4, color: colors.ink, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line },
  btn: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 20, alignItems: "center" },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { color: colors.white, fontFamily: font.semi, fontSize: 16 },
  pill: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  pillText: { fontFamily: font.semi, fontSize: 14, color: colors.inkSoft },
});
