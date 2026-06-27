import { isCoordinatesInServiceArea } from "@/components/map/serviceArea";
import { getReportImageUrls, listLatestReports, subscribeToReports, type ReportDocument } from "@/services/appwrite";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
    CalendarClockIcon,
    CheckIcon,
    CircleAlertIcon,
    FlameIcon,
    ImageIcon,
    LightbulbIcon,
    MapPinIcon,
    RadioIcon,
    ShieldIcon,
    SirenIcon,
    TrafficConeIcon,
    Trash2Icon,
    Volume2Icon,
    XIcon,
    type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CATEGORY_META: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  security: { label: "Seguridad", color: "#00B7FF", Icon: ShieldIcon },
  traffic: { label: "Transito", color: "#F56A6A", Icon: TrafficConeIcon },
  infrastructure: { label: "Infraestructura", color: "#E2A712", Icon: CircleAlertIcon },
  lighting: { label: "Problema de luz", color: "#F5C648", Icon: LightbulbIcon },
  waste: { label: "Basura", color: "#57C777", Icon: Trash2Icon },
  fire: { label: "Incendio", color: "#FF6A3D", Icon: FlameIcon },
  noise: { label: "Ruidos", color: "#9A7BFF", Icon: Volume2Icon },
  accident: { label: "Accidente", color: "#A44A4A", Icon: SirenIcon },
};

const STATUS_META: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  active: { label: "Activo", color: "#F5C648", Icon: CircleAlertIcon },
  solved: { label: "Resuelto", color: "#57C777", Icon: CheckIcon },
  false: { label: "Falso", color: "#F56A6A", Icon: XIcon },
};

const TAB_BAR_HEIGHT = 68;
const POSSIBLY_FALSE_RATING_THRESHOLD = -3;

function formatLongSpanishDate(date: Date): string {
  const day = new Intl.DateTimeFormat("es-CL", { day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(date);
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

  return `${day} de ${capitalizedMonth}`;
}

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

  return formatLongSpanishDate(new Date(timestamp));
}

function getReportRating(report: Pick<ReportDocument, "rating">): number {
  const rating = report.rating;
  return typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
}

function getReportLocationLabel(report: Pick<ReportDocument, "locationLabel">): string {
  const locationLabel = report.locationLabel?.trim();

  if (locationLabel) {
    return locationLabel;
  }

  return "Ubicacion aproximada";
}

function formatTruthfulnessScore(rating: number): string {
  return rating > 0 ? `+${rating}` : String(rating);
}

function getTruthfulnessMeta(rating: number): { accessibilityLabel: string; color: string; Icon: LucideIcon } {
  if (rating <= POSSIBLY_FALSE_RATING_THRESHOLD) {
    return { accessibilityLabel: "Posiblemente falso", color: "#FF8B8B", Icon: CircleAlertIcon };
  }

  if (rating < 0) {
    return { accessibilityLabel: "Veracidad en duda", color: "#FFB35C", Icon: CircleAlertIcon };
  }

  if (rating > 0) {
    return { accessibilityLabel: "Veracidad positiva", color: "#57C777", Icon: CheckIcon };
  }

  return { accessibilityLabel: "Sin votos de veracidad", color: "#A8C1DE", Icon: ShieldIcon };
}

export default function RssScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshReports = useCallback(async () => {
    try {
      const documents = await listLatestReports();
      setReports(documents.filter((report) => isCoordinatesInServiceArea(report)));
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
    const refreshTimer = setTimeout(() => {
      void refreshReports();
    }, 0);

    let unsubscribe: (() => void) | null = null;
    let errorTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      unsubscribe = subscribeToReports(() => {
        void refreshReports();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar la conexion en tiempo real.";
      errorTimer = setTimeout(() => {
        setError(message);
      }, 0);
    }

    return () => {
      clearTimeout(refreshTimer);
      if (errorTimer) {
        clearTimeout(errorTimer);
      }
      unsubscribe?.();
    };
  }, [refreshReports]);

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
          const truthfulnessRating = getReportRating(item);
          const truthfulnessMeta = getTruthfulnessMeta(truthfulnessRating);

          return (
            <Pressable
              onPress={() => handleOpenReportOnMap(item)}
              style={({ pressed }) => [
                styles.reportCard,
                pressed && styles.reportCardPressed,
              ]}
            >
              {primaryImage ? (
                <View style={styles.imageFrame}>
                  <Image
                    source={{ uri: primaryImage }}
                    style={styles.reportImage}
                    contentFit="cover"
                  />

                  <View style={styles.imageShade} />

                  <View style={styles.topOverlayRow}>
                    <View style={[styles.overlayPill, { borderColor: `${categoryMeta.color}70` }]}>
                      <categoryMeta.Icon size={12} color={categoryMeta.color} />
                      <Text style={[styles.overlayPillText, { color: categoryMeta.color }]}>{categoryMeta.label}</Text>
                    </View>

                    <View style={styles.imageCountPill}>
                      <ImageIcon size={12} color="#F2F2F2" />
                      <Text style={styles.imageCountText}>{imageUrls.length}</Text>
                    </View>
                  </View>

                  {extraImages > 0 ? (
                    <View style={styles.extraImagePill}>
                      <Text style={styles.extraImageText}>+{extraImages}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.noImageFrame}>
                  <View style={[styles.noImageIcon, { backgroundColor: `${categoryMeta.color}22` }]}>
                    <categoryMeta.Icon size={26} color={categoryMeta.color} />
                  </View>
                  <Text style={styles.noImageText}>{categoryMeta.label}</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.cardMetaRow}>
                  <View style={[styles.statusPill, { borderColor: `${statusMeta.color}70` }]}>
                    <statusMeta.Icon size={12} color={statusMeta.color} />
                    <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                  </View>

                  <View style={styles.cardMetaRight}>
                    <View style={styles.timeMeta}>
                      <CalendarClockIcon size={13} color="#9B9B9B" />
                      <Text style={styles.timeMetaText} numberOfLines={1}>
                        {formatRelativeDate(item.$createdAt)}
                      </Text>
                    </View>

                    <View
                      accessible
                      accessibilityLabel={`${truthfulnessMeta.accessibilityLabel}: ${formatTruthfulnessScore(truthfulnessRating)}`}
                      style={styles.truthfulnessInline}
                    >
                      <truthfulnessMeta.Icon size={13} color={truthfulnessMeta.color} strokeWidth={2.8} />
                      <Text style={[styles.truthfulnessInlineText, { color: truthfulnessMeta.color }]}>
                        {formatTruthfulnessScore(truthfulnessRating)}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title || "Sin titulo"}
                </Text>

                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.locationRow}>
                  <MapPinIcon size={13} color="#8C8C8C" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {getReportLocationLabel(item)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
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
  reportCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#171717",
    overflow: "hidden",
  },
  reportCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  imageFrame: {
    height: 190,
    position: "relative",
    backgroundColor: "#202020",
  },
  reportImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#202020",
  },
  imageShade: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.16)",
  },
  topOverlayRow: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  overlayPill: {
    maxWidth: "72%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(14, 14, 15, 0.78)",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  overlayPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  imageCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "rgba(14, 14, 15, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  imageCountText: {
    color: "#F2F2F2",
    fontSize: 11,
    fontWeight: "800",
  },
  extraImagePill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    borderRadius: 999,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  extraImageText: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "900",
  },
  noImageFrame: {
    height: 118,
    backgroundColor: "#202020",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  noImageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: "#DADADA",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 13,
    gap: 8,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#222222",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  cardMetaRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 0,
    gap: 10,
  },
  timeMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    flexShrink: 1,
    minWidth: 0,
  },
  timeMetaText: {
    color: "#9B9B9B",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  truthfulnessInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  truthfulnessInlineText: {
    fontSize: 12,
    fontWeight: "900",
    minWidth: 18,
    textAlign: "right",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 23,
  },
  cardDescription: {
    color: "#C7C7C7",
    fontSize: 14,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  locationText: {
    color: "#8C8C8C",
    fontSize: 12,
    fontWeight: "700",
  },
});
