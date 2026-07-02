import { Marker } from "@maplibre/maplibre-react-native";
import { AnimatedMarkerContent } from "@/features/map/components/AnimatedMarkerContent";
import { CircleAlertIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import type { ReportZoneCounter } from "@/features/map/utils/reportZones";

type ReportZoneMarkerProps = {
  isVisible: boolean;
  onPress: (zoneCounter: ReportZoneCounter) => void;
  zoneCounter: ReportZoneCounter;
};

export function ReportZoneMarker({ isVisible, onPress, zoneCounter }: ReportZoneMarkerProps) {
  return (
    <Marker
      id={zoneCounter.id}
      lngLat={zoneCounter.coordinate}
      anchor="center"
      onPress={() => {
        if (isVisible) {
          onPress(zoneCounter);
        }
      }}
    >
      <AnimatedMarkerContent
        accessibilityLabel={`${zoneCounter.count} ${zoneCounter.count === 1 ? "reporte" : "reportes"} en esta zona. Toca para acercar.`}
        accessibilityRole="button"
        accessible
        isVisible={isVisible}
        style={styles.zoneCounterContainer}
      >
        <View style={styles.zoneCounterBubble}>
          <CircleAlertIcon size={15} color="#06121E" strokeWidth={2.8} />
          <Text numberOfLines={1} style={styles.zoneCounterCount}>
            {zoneCounter.count}
          </Text>
        </View>

        <View style={styles.zoneCounterLabelPill}>
          <Text numberOfLines={1} style={styles.zoneCounterLabelText}>
            {zoneCounter.count === 1 ? "REPORTE" : "REPORTES"}
          </Text>
        </View>
      </AnimatedMarkerContent>
    </Marker>
  );
}

const styles = StyleSheet.create({
  zoneCounterContainer: {
    alignItems: "center",
    width: 86,
    minHeight: 72,
    justifyContent: "center",
  },
  zoneCounterBubble: {
    minWidth: 54,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 12,
    backgroundColor: "#F5C648",
    borderWidth: 2,
    borderColor: "rgba(8, 26, 42, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  zoneCounterCount: {
    color: "#06121E",
    fontSize: 16,
    fontWeight: "900",
  },
  zoneCounterLabelPill: {
    marginTop: 5,
    backgroundColor: "#151515",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245, 198, 72, 0.34)",
  },
  zoneCounterLabelText: {
    color: "#F4E6A5",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
