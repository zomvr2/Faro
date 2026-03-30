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
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: focused ? "rgba(0, 200, 255, 0.2)" : "transparent",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Icon size={size} color={focused ? "#00C8FF" : color} />
    </View>
  );
}
