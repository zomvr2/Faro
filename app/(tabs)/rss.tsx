import { getReportImageUrls, listLatestReports, subscribeToReports, type ReportDocument } from "@/services/appwrite";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  CalendarClockIcon,
  CheckIcon,
  CircleAlertIcon,
  DropletsIcon,
  ImageIcon,
  LightbulbIcon,
  MapPinIcon,
  PawPrintIcon,
  RadioIcon,
  ShieldIcon,
  TrafficConeIcon,
  Trash2Icon,
  Volume2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

const CATEGORY_META: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  security: { label: "Seguridad", color: "#00B7FF", Icon: ShieldIcon },
  traffic: { label: "Transito", color: "#F56A6A", Icon: TrafficConeIcon },
  infrastructure: { label: "Infraestructura", color: "#E2A712", Icon: CircleAlertIcon },
  lighting: { label: "Alumbrado", color: "#F5C648", Icon: LightbulbIcon },
  waste: { label: "Basura", color: "#57C777", Icon: Trash2Icon },
  water: { label: "Agua", color: "#42B8FF", Icon: DropletsIcon },
  noise: { label: "Ruidos", color: "#9A7BFF", Icon: Volume2Icon },
  animals: { label: "Mascotas", color: "#FFAA4D", Icon: PawPrintIcon },
};

const STATUS_META: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  active: { label: "Activo", color: "#F5C648", Icon: CircleAlertIcon },
  solved: { label: "Resuelto", color: "#57C777", Icon: CheckIcon },
  false: { label: "Falso", color: "#F56A6A", Icon: XIcon },
};

function formatRelativeDate(dateValue: string): string {
  const timestamp = Date.parse(dateValue);

  if (Number.isNaN(timestamp)) {
    return "Fecha desconocida";
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return "Hace instantes";
  }

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  if (days < 7) {
    return `Hace ${days} d`;
  }

  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(new Date(timestamp));
}

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

      <View
        style={{
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(37, 199, 255, 0.35)",
          backgroundColor: "rgba(20, 58, 88, 0.45)",
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <RadioIcon size={14} color="#25C7FF" />
        <Text style={{ color: "#BFE8FF", fontSize: 12, fontWeight: "700" }}>Actualizacion en vivo</Text>
      </View>

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
          const categoryMeta =
            CATEGORY_META[item.category] ?? {
              label: item.category,
              color: "#25C7FF",
              Icon: ShieldIcon,
            };
          const statusMeta =
            STATUS_META[item.status] ?? {
              label: item.status,
              color: "#A8C1DE",
              Icon: CircleAlertIcon,
            };
          const primaryImage = imageUrls[0] ?? null;
          const extraImages = Math.max(0, imageUrls.length - 1);

          return (
            <Pressable
              onPress={() => handleOpenReportOnMap(item)}
              style={({ pressed }) => ({
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(167, 184, 207, 0.24)",
                backgroundColor: "rgba(14, 34, 70, 0.48)",
                overflow: "hidden",
                opacity: pressed ? 0.88 : 1,
              })}
            >
              {primaryImage ? (
                <View style={{ position: "relative" }}>
                  <Image
                    source={{ uri: primaryImage }}
                    style={{ width: "100%", height: 140, backgroundColor: "#173055" }}
                    contentFit="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(7, 18, 30, 0.72)",
                      borderWidth: 1,
                      borderColor: "rgba(187, 214, 240, 0.35)",
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                    }}
                  >
                    <ImageIcon size={12} color="#D7E5FB" />
                    <Text style={{ color: "#D7E5FB", fontSize: 11, fontWeight: "700" }}>
                      {imageUrls.length}
                    </Text>
                  </View>
                  {extraImages > 0 ? (
                    <View
                      style={{
                        position: "absolute",
                        right: 10,
                        top: 10,
                        borderRadius: 999,
                        backgroundColor: "rgba(37, 199, 255, 0.9)",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: "#00131A", fontSize: 11, fontWeight: "800" }}>+{extraImages}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={{ padding: 12, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(12, 26, 42, 0.7)",
                      borderWidth: 1,
                      borderColor: `${categoryMeta.color}80`,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                    }}
                  >
                    <categoryMeta.Icon size={12} color={categoryMeta.color} />
                    <Text style={{ color: categoryMeta.color, fontSize: 11, fontWeight: "800" }}>{categoryMeta.label}</Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(12, 26, 42, 0.7)",
                      borderWidth: 1,
                      borderColor: `${statusMeta.color}80`,
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                    }}
                  >
                    <statusMeta.Icon size={12} color={statusMeta.color} />
                    <Text style={{ color: statusMeta.color, fontSize: 11, fontWeight: "800" }}>{statusMeta.label}</Text>
                  </View>
                </View>

                <Text style={{ color: "#EAF3FF", fontSize: 17, fontWeight: "800" }} numberOfLines={1}>
                  {item.title || "Sin titulo"}
                </Text>

                <Text style={{ color: "#BCD1EA", fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <CalendarClockIcon size={13} color="#8FB3D9" />
                    <Text style={{ color: "#8FB3D9", fontSize: 12, fontWeight: "600" }}>
                      {formatRelativeDate(item.$createdAt)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MapPinIcon size={13} color="#8FB3D9" />
                    <Text style={{ color: "#8FB3D9", fontSize: 12, fontWeight: "600" }}>
                      {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
