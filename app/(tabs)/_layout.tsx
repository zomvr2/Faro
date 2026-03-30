import { Tabs } from "expo-router";
import { MapIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 25;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelPosition: "beside-icon",
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 20),
          borderRadius: 20,
          height: 64,
          marginHorizontal: 16,
          elevation: 6,
          backgroundColor: "rgb(255, 255, 255, 0.9)",
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MapIcon size={ICON_SIZE} color={color} />,
        }}
      />
    </Tabs>
  )
}