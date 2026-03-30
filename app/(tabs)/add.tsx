import { Text, View } from "react-native";

export default function AddScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Add</Text>
    </View>
  );
}
