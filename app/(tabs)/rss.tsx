import { ReportCard } from "@/features/reports/components/ReportCard";
import { useRealtimeReports } from "@/features/reports/hooks/useRealtimeReports";
import type { ReportDocument } from "@/services/appwrite";
import { router } from "expo-router";
import { RadioIcon } from "lucide-react-native";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_HEIGHT = 68;

export default function RssScreen() {
  const insets = useSafeAreaInsets();
  const { error, isLoading, reports } = useRealtimeReports();

  const handleOpenReportOnMap = useCallback((report: ReportDocument) => {
    router.push({
      pathname: "/(tabs)",
      params: {
        focus: Date.now().toString(),
        reportId: report.$id,
        lat: String(report.lat),
        lng: String(report.lng),
      },
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#F5F5F5" size="large" />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 18,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Faro Live</Text>
          <Text style={styles.title}>Reportes en tiempo real</Text>
        </View>

        <View style={styles.livePill}>
          <RadioIcon size={13} color="#111111" />
          <Text style={styles.livePillText}>Live</Text>
        </View>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <FlatList
        style={styles.list}
        data={reports}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={{
          gap: 14,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 34,
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay reportes todavia.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ReportCard report={item} onPress={handleOpenReportOnMap} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0B",
    gap: 12,
    paddingHorizontal: 20,
  },
  loadingText: {
    color: "#EDEDED",
    fontSize: 15,
    fontWeight: "600",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0A0A0B",
    paddingHorizontal: 14,
  },
  header: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: "#8E8E8E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  livePill: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F4F4F4",
  },
  livePillText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
  },
  errorText: {
    color: "#FF8C8C",
    marginBottom: 14,
    fontSize: 14,
    fontWeight: "700",
  },
  list: {
    flex: 1,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#171717",
    padding: 16,
  },
  emptyText: {
    color: "#D6D6D6",
    fontSize: 14,
    fontWeight: "600",
  },
});
