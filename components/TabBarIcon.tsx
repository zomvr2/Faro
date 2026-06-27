import { LucideIcon } from "lucide-react-native";
import { type ColorValue, View } from "react-native";

interface TabBarIconProps {
  Icon: LucideIcon;
  color: ColorValue;
  focused: boolean;
  size?: number;
}

export function TabBarIcon({ 
  Icon, 
  color, 
  focused, 
  size = 25 
}: TabBarIconProps) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: focused ? "#F4F4F4" : "rgba(255, 255, 255, 0.06)",
        borderWidth: 1,
        borderColor: focused ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.08)",
        opacity: focused ? 1 : 0.78,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Icon size={size} color={focused ? "#111111" : String(color)} strokeWidth={focused ? 2.8 : 2.3} />
    </View>
  );
}
