import { getReportImageUrls, type ReportDocument } from "@/services/appwrite";
import { formatFeedRelativeDate } from "@/shared/reports/formatters";
import {
  formatTruthfulnessScore,
  getReportLocationLabel,
  getReportRating,
} from "@/shared/reports/reportSelectors";
import { POSSIBLY_FALSE_RATING_THRESHOLD } from "@/shared/reports/constants";
import { Image } from "expo-image";
import {
  CalendarClockIcon,
  CheckIcon,
  CircleAlertIcon,
  FlameIcon,
  ImageIcon,
  LightbulbIcon,
  MapPinIcon,
  ShieldIcon,
  SirenIcon,
  TrafficConeIcon,
  Trash2Icon,
  Volume2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

const CATEGORY_META: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  security: { label: "Seguridad", color: "#00B7FF", Icon: ShieldIcon },
  traffic: { label: "Transito", color: "#F56A6A", Icon: TrafficConeIcon },
  infrastructure: { label: "Infraestructura", color: "#E2A712", Icon: CircleAlertIcon },
  lighting: { label: "Problema de luz", color: "#F5C648", Icon: LightbulbIcon },
  waste: { label: "Basura", color: "#57C777", Icon: Trash2Icon },
  fire: { label: "Incendio", color: "#FF6A3D", Icon: FlameIcon },
  noise: { label: "Ruidos", color: "#9A7BFF", Icon: Volume2Icon },
  accident: { label: "Accidente", color: "#A44A4A", Icon: SirenIcon },
  event: { label: "Evento", color: "#2FC2A6", Icon: CalendarClockIcon },
};

const STATUS_META: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  active: { label: "Activo", color: "#F5C648", Icon: CircleAlertIcon },
  solved: { label: "Resuelto", color: "#57C777", Icon: CheckIcon },
  false: { label: "Falso", color: "#F56A6A", Icon: XIcon },
};

type TruthfulnessMeta = {
  accessibilityLabel: string;
  color: string;
  Icon: LucideIcon;
};

type ReportCardProps = {
  report: ReportDocument;
  onPress: (report: ReportDocument) => void;
};

function getTruthfulnessMeta(rating: number): TruthfulnessMeta {
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

export function ReportCard({ report, onPress }: ReportCardProps) {
  const imageUrls = getReportImageUrls(report);
  const categoryMeta =
    CATEGORY_META[report.category] ?? {
      label: report.category,
      color: "#25C7FF",
      Icon: ShieldIcon,
    };
  const statusMeta =
    STATUS_META[report.status] ?? {
      label: report.status,
      color: "#A8C1DE",
      Icon: CircleAlertIcon,
    };
  const primaryImage = imageUrls[0] ?? null;
  const extraImages = Math.max(0, imageUrls.length - 1);
  const truthfulnessRating = getReportRating(report);
  const truthfulnessMeta = getTruthfulnessMeta(truthfulnessRating);

  return (
    <Pressable
      onPress={() => onPress(report)}
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
              <Text style={[styles.overlayPillText, { color: categoryMeta.color }]}>
                {categoryMeta.label}
              </Text>
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
            <Text
              numberOfLines={1}
              style={[styles.statusPillText, { color: statusMeta.color }]}
            >
              {statusMeta.label}
            </Text>
          </View>

          <View style={styles.cardMetaRight}>
            <View style={styles.timeMeta}>
              <CalendarClockIcon size={13} color="#9B9B9B" />
              <Text style={styles.timeMetaText} numberOfLines={1}>
                {formatFeedRelativeDate(report.$createdAt)}
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
          {report.title || "Sin titulo"}
        </Text>

        <Text style={styles.cardDescription} numberOfLines={2}>
          {report.description}
        </Text>

        <View style={styles.locationRow}>
          <MapPinIcon size={13} color="#8C8C8C" />
          <Text style={styles.locationText} numberOfLines={1}>
            {getReportLocationLabel(report)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    flexShrink: 1,
    minWidth: 0,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "900",
    flexShrink: 1,
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
