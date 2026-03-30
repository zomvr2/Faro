import { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

interface TabBarIconProps {
  Icon: LucideIcon;
  color: string;
  focused: boolean;
  size?: number;
}

export function TabBarIcon({ 
  Icon, 
  color, 
  focused, 
  size = 25 
}: TabBarIconProps) {
  const containerRadius = 14;

  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: containerRadius,
        overflow: "hidden",
        backgroundColor: focused ? "rgba(0, 200, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
        opacity: focused ? 1 : 0.65,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Icon size={size} color={focused ? "#00C8FF" : color} />
    </View>
  );
}
