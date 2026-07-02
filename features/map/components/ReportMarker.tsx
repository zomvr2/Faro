import { Marker } from "@maplibre/maplibre-react-native";
import { AnimatedMarkerContent } from "@/features/map/components/AnimatedMarkerContent";
import { CircleAlertIcon, type LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import type { ReportDocument } from "@/services/appwrite";

type ReportMarkerProps = {
  isPossiblyFalse: boolean;
  isVisible: boolean;
  markerStyle: {
    label: string;
    color: string;
    Icon: LucideIcon;
  };
  onPress: (report: ReportDocument) => void;
  report: ReportDocument;
};

export function ReportMarker({
  isPossiblyFalse,
  isVisible,
  markerStyle,
  onPress,
  report,
}: ReportMarkerProps) {
  return (
    <Marker
      id={report.$id}
      lngLat={[report.lng, report.lat]}
      anchor="bottom"
      onPress={() => {
        if (isVisible) {
          onPress(report);
        }
      }}
    >
      <AnimatedMarkerContent isVisible={isVisible} style={styles.markerContainer}>
        <View style={[styles.markerIconCircle, { backgroundColor: markerStyle.color }]}>
          <markerStyle.Icon size={14} color="#06121E" strokeWidth={2.4} />
        </View>

        {isPossiblyFalse ? (
          <View style={styles.markerWarningPill}>
            <CircleAlertIcon size={10} color="#FFB4B4" strokeWidth={2.8} />
            <Text numberOfLines={1} style={styles.markerWarningText}>
              DUDOSO
            </Text>
          </View>
        ) : null}

        <View style={styles.markerLabelPill}>
          <Text numberOfLines={1} style={styles.markerLabelText}>
            {markerStyle.label}
          </Text>
        </View>

        <View style={styles.markerTip} />
      </AnimatedMarkerContent>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
    width: 108,
    minHeight: 78,
    justifyContent: "flex-end",
    paddingBottom: 0,
  },
  markerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(8, 26, 42, 0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.26,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  markerWarningPill: {
    marginTop: 5,
    backgroundColor: "#3A1717",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 139, 139, 0.42)",
    maxWidth: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  markerWarningText: {
    color: "#FFB4B4",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  markerLabelPill: {
    marginTop: 6,
    backgroundColor: "#2E3A5D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(149, 174, 220, 0.2)",
    maxWidth: 104,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  markerTip: {
    width: 0,
    height: 0,
    marginTop: 3,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2E3A5D",
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DCE8FF",
    letterSpacing: 0.4,
  },
});
