import { getReportImageUrls, listLatestReports, type ReportDocument, subscribeToReports } from "@/services/appwrite";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

export default function RssScreen() {
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshReports = useCallback(async () => {
    try {
      const documents = await listLatestReports();
      setReports(documents);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los reportes.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshReports();

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToReports(() => {
        void refreshReports();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar la conexion en tiempo real.";
      setError(message);
    }

    return () => {
      unsubscribe?.();
    };
  }, [refreshReports]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#050C18",
          gap: 12,
          paddingHorizontal: 20,
        }}
      >
        <ActivityIndicator color="#25C7FF" size="large" />
        <Text style={{ color: "#D7E5FB", fontSize: 15 }}>Cargando reportes...</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050C18",
        paddingHorizontal: 16,
        paddingTop: 20,
      }}
    >
      <Text style={{ color: "#E7F0FF", fontSize: 26, fontWeight: "800", marginBottom: 16 }}>
        Reportes en tiempo real
      </Text>

      {error ? (
        <Text style={{ color: "#FF8C8C", marginBottom: 16, fontSize: 14, fontWeight: "600" }}>{error}</Text>
      ) : null}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(167, 184, 207, 0.3)",
              backgroundColor: "rgba(14, 34, 70, 0.4)",
              padding: 14,
            }}
          >
            <Text style={{ color: "#D7E5FB", fontSize: 14 }}>No hay reportes todavia.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const imageUrls = getReportImageUrls(item);

          return (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(167, 184, 207, 0.3)",
              backgroundColor: "rgba(14, 34, 70, 0.4)",
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={{ color: "#25C7FF", fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>
              {item.category}
            </Text>
            <Text style={{ color: "#E7F0FF", fontSize: 17, fontWeight: "800" }}>
              {item.title || "Sin titulo"}
            </Text>
            <Text style={{ color: "#E7F0FF", fontSize: 15, fontWeight: "600" }}>{item.description}</Text>
            <Text style={{ color: "#A8C1DE", fontSize: 12, textTransform: "uppercase" }}>
              Estado: {item.status}
            </Text>
            <Text style={{ color: "#A8C1DE", fontSize: 12 }}>
              Ubicacion: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
            </Text>
            <Text style={{ color: "#A8C1DE", fontSize: 12 }}>
              Imagenes: {imageUrls.length}
            </Text>
            <Text style={{ color: "#7E95B2", fontSize: 12 }}>ID: {item.$id}</Text>
            <Text style={{ color: "#7E95B2", fontSize: 12 }}>Fecha: {new Date(item.$createdAt).toLocaleString()}</Text>
          </View>
          );
        }}
      />
    </View>
  );
}
