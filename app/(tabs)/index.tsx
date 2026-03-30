import { StatusBar, View } from "react-native";

// Components
import Map from "@/components/map/map";

export default function Index() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle={"dark-content"} />
      <Map />
    </View>
  );
}
