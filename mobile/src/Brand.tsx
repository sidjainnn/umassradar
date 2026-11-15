import { Image, Text, View } from "react-native";
import { colors, font } from "./theme";

export function Brand({ color = colors.maroon, size = 32 }: { color?: string; size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="OneMass" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: size, height: size, borderRadius: size / 4, backgroundColor: color }}>
        <Image source={require("../assets/onemass-glyph.png")} style={{ width: size, height: size }} resizeMode="contain" />
      </View>
      <Text style={{ fontFamily: font.bold, fontSize: 17, letterSpacing: -0.4, color: colors.ink }}>One<Text style={{ color }}>Mass</Text></Text>
    </View>
  );
}
