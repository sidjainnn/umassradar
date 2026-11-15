import { Manrope_600SemiBold, Manrope_800ExtraBold, useFonts } from "@expo-google-fonts/manrope";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Home from "./src/screens/Home";
import MapScreen from "./src/screens/MapScreen";
import SignIn from "./src/screens/SignIn";
import Todo from "./src/screens/Todo";
import { SessionProvider, useSession } from "./src/session";
import { accent, colors, font } from "./src/theme";

const Tab = createBottomTabNavigator();

function TabDot({ focused, color }: { focused: boolean; color: string }) {
  // minimal tabs: a small dot, no icons or emoji
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: focused ? color : "transparent", marginTop: 6 }} />;
}

function Tabs() {
  const { me, ready } = useSession();
  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.maroon} /></View>;
  if (!me) return <SignIn />;
  const a = accent(me.mode);
  return (
    <Tab.Navigator
      initialRouteName="Map"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: a.main,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabel: ({ color, children }) => <Text style={{ color, fontFamily: font.semi, fontSize: 13 }}>{children}</Text>,
        tabBarIcon: ({ focused, color }) => <TabDot focused={focused} color={color} />,
        tabBarStyle: { borderTopColor: colors.line },
      }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="To do" component={Todo} />
      <Tab.Screen name="Map" component={MapScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loaded] = useFonts({ Manrope_600SemiBold, Manrope_800ExtraBold });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper } }}>
          <StatusBar style="dark" />
          <Tabs />
        </NavigationContainer>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
