import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  Calendar,
  CheckIcon,
  CircleAlertIcon,
  ImageIcon,
  MapPin,
  XIcon,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, type RefObject } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type {
  ReportDocument,
  ReportRatingVote,
} from "@/services/appwrite";
import { formatReportDate } from "@/shared/reports/formatters";
import {
  formatTruthfulnessScore,
  getStatusDetail,
  getTruthfulnessLabel,
} from "@/shared/reports/reportSelectors";

const BOTTOM_SHEET_SNAP_POINTS = ["80%"];

type ReportVisualStyle = {
  label: string;
  color: string;
  Icon: LucideIcon;
};

type ReportDetailsSheetProps = {
  distanceLabel: string;
  imageUrls: string[];
  isPossiblyFalse: boolean;
  isVoting: boolean;
  locationLabel: string;
  markerStyle: ReportVisualStyle | null;
  onChange: (index: number) => void;
  onClose: () => void;
  onOpenGalleryAtIndex: (index: number) => void;
  onVote: (vote: ReportRatingVote) => void;
  rating: number;
  report: ReportDocument | null;
  sheetRef: RefObject<BottomSheetModal | null>;
  statusStyle: ReportVisualStyle | null;
};

export function ReportDetailsSheet({
  distanceLabel,
  imageUrls,
  isPossiblyFalse,
  isVoting,
  locationLabel,
  markerStyle,
  onChange,
  onClose,
  onOpenGalleryAtIndex,
  onVote,
  rating,
  report,
  sheetRef,
  statusStyle,
}: ReportDetailsSheetProps) {
  const renderBottomSheetBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      opacity={0.48}
    />
  ), []);

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={BOTTOM_SHEET_SNAP_POINTS}
      onChange={onChange}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBottomSheetBackdrop}
      handleIndicatorStyle={styles.bottomSheetHandle}
      backgroundStyle={styles.bottomSheetBackground}
    >
      {report && markerStyle ? (
        <BottomSheetScrollView
          contentContainerStyle={styles.bottomSheetContent}
          showsVerticalScrollIndicator
        >
          <View style={styles.reportHero}>
            {imageUrls.length > 0 ? (
              <Pressable onPress={() => onOpenGalleryAtIndex(0)} style={styles.reportHeroMedia}>
                <Image
                  source={{ uri: imageUrls[0] }}
                  style={styles.reportHeroImage}
                  resizeMode="cover"
                />
              </Pressable>
            ) : (
              <View style={styles.reportHeroFallback}>
                <markerStyle.Icon size={40} color={markerStyle.color} strokeWidth={2.2} />
                <Text style={styles.reportHeroFallbackText}>{markerStyle.label}</Text>
              </View>
            )}

            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={10}>
              <XIcon color="#F3F7FF" size={20} />
            </Pressable>

            <View style={styles.heroBadgesRow}>
              <View style={[styles.categoryBadge, { borderColor: `${markerStyle.color}80` }]}>
                <markerStyle.Icon size={12} color={markerStyle.color} strokeWidth={2.8} />
                <Text style={[styles.categoryBadgeText, { color: markerStyle.color }]}>
                  {markerStyle.label}
                </Text>
              </View>

              {imageUrls.length > 0 ? (
                <View style={styles.photoCountBadge}>
                  <ImageIcon size={14} color="#D5E4FB" strokeWidth={2.2} />
                  <Text style={styles.photoCountText}>
                    {imageUrls.length} {imageUrls.length === 1 ? "imagen" : "imagenes"}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.reportSummaryBody}>
            <View style={styles.reportMetadata}>
              <View style={styles.metadataItem}>
                <MapPin size={14} color="#9AA7B8" />
                <Text numberOfLines={1} style={styles.metadataText}>
                  {distanceLabel} - {locationLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.reportTitle}>{report.title?.trim() || "Sin titulo"}</Text>

            <View style={styles.reportMetadata}>
              <View style={styles.metadataItem}>
                <Calendar size={14} color="#8795A8" />
                <Text style={styles.metadataText}>
                  Reportado {formatReportDate(report.$createdAt).replace(/^Hace/, "hace")}
                </Text>
              </View>
            </View>

            {statusStyle ? (
              <View
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor: `${statusStyle.color}24`,
                    borderColor: `${statusStyle.color}80`,
                  },
                ]}
              >
                <statusStyle.Icon size={18} color={statusStyle.color} strokeWidth={2.8} />
                <Text style={styles.statusBannerText} numberOfLines={1}>
                  <Text style={{ color: "#F3F8FF", fontWeight: "900" }}>{statusStyle.label}</Text>
                  {" - "}
                  {getStatusDetail(report.status)}
                </Text>
              </View>
            ) : null}

            {isPossiblyFalse ? (
              <View style={styles.truthWarningBanner}>
                <CircleAlertIcon size={20} color="#FF8B8B" strokeWidth={2.8} />
                <View style={styles.truthWarningCopy}>
                  <Text style={styles.truthWarningTitle}>Posiblemente falso</Text>
                  <Text style={styles.truthWarningText}>
                    Este reporte acumula varios votos negativos. Se mantiene visible como advertencia.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.truthfulnessPanel}>
              <View
                style={[
                  styles.truthfulnessScoreBadge,
                  rating < 0 && styles.truthfulnessScoreBadgeNegative,
                  rating > 0 && styles.truthfulnessScoreBadgePositive,
                ]}
              >
                <Text
                  style={[
                    styles.truthfulnessScoreText,
                    rating < 0 && styles.truthfulnessScoreTextNegative,
                    rating > 0 && styles.truthfulnessScoreTextPositive,
                  ]}
                >
                  {formatTruthfulnessScore(rating)}
                </Text>
              </View>

              <View style={styles.truthfulnessCopy}>
                <Text style={styles.truthfulnessLabel}>
                  {getTruthfulnessLabel(rating)}
                </Text>
                <Text style={styles.truthfulnessText}>Puntaje de veracidad de la comunidad</Text>
              </View>
            </View>

            <View style={styles.voteActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Marcar reporte como veridico"
                disabled={isVoting}
                onPress={() => {
                  onVote("truthful");
                }}
                style={({ pressed }) => [
                  styles.voteButton,
                  styles.truthVoteButton,
                  isVoting && styles.voteButtonDisabled,
                  pressed && styles.voteButtonPressed,
                ]}
              >
                <CheckIcon size={16} color="#167A3E" strokeWidth={3} />
                <Text style={[styles.voteButtonText, styles.truthVoteButtonText]}>Veridico</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Marcar reporte como falso"
                disabled={isVoting}
                onPress={() => {
                  onVote("false");
                }}
                style={({ pressed }) => [
                  styles.voteButton,
                  styles.falseVoteButton,
                  isVoting && styles.voteButtonDisabled,
                  pressed && styles.voteButtonPressed,
                ]}
              >
                <XIcon size={16} color="#FF8B8B" strokeWidth={3} />
                <Text style={styles.voteButtonText}>Falso</Text>
              </Pressable>
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Resumen</Text>
              <Text style={styles.descriptionText}>
                {report.description?.trim() || "Sin descripcion"}
              </Text>
            </View>
          </View>
        </BottomSheetScrollView>
      ) : null}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bottomSheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(245, 248, 255, 0.34)",
  },
  bottomSheetBackground: {
    backgroundColor: "#151515",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bottomSheetContent: {
    paddingHorizontal: 14,
    paddingBottom: 34,
    gap: 0,
  },
  reportHero: {
    height: 214,
    marginHorizontal: -14,
    marginTop: -2,
    backgroundColor: "#202020",
    overflow: "hidden",
    position: "relative",
  },
  reportHeroMedia: {
    flex: 1,
  },
  reportHeroImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#202020",
  },
  reportHeroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1D1D1D",
    gap: 8,
  },
  reportHeroFallbackText: {
    color: "#EDEDED",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroBadgesRow: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reportSummaryBody: {
    paddingTop: 14,
    gap: 10,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(18, 18, 18, 0.76)",
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  reportTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 28,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(17, 17, 17, 0.68)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  reportMetadata: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
    gap: 6,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  metadataText: {
    color: "#9C9C9C",
    fontSize: 13,
    fontWeight: "600",
  },
  photoCountBadge: {
    backgroundColor: "rgba(18, 18, 18, 0.76)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  photoCountText: {
    color: "#EDEDED",
    fontSize: 11,
    fontWeight: "700",
  },
  statusBanner: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBannerText: {
    flex: 1,
    color: "#E5E5E5",
    fontSize: 14,
    fontWeight: "700",
  },
  truthWarningBanner: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 139, 139, 0.52)",
    backgroundColor: "rgba(201, 31, 50, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  truthWarningCopy: {
    flex: 1,
    gap: 3,
  },
  truthWarningTitle: {
    color: "#FFE4E4",
    fontSize: 15,
    fontWeight: "900",
  },
  truthWarningText: {
    color: "#F6CACA",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  truthfulnessPanel: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  truthfulnessScoreBadge: {
    minWidth: 44,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2E2E2E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  truthfulnessScoreBadgeNegative: {
    backgroundColor: "#3A1717",
    borderColor: "rgba(255, 139, 139, 0.38)",
  },
  truthfulnessScoreBadgePositive: {
    backgroundColor: "#DFF7E9",
    borderColor: "rgba(99, 220, 144, 0.42)",
  },
  truthfulnessScoreText: {
    color: "#EDEDED",
    fontSize: 16,
    fontWeight: "900",
  },
  truthfulnessScoreTextNegative: {
    color: "#FFB4B4",
  },
  truthfulnessScoreTextPositive: {
    color: "#167A3E",
  },
  truthfulnessCopy: {
    flex: 1,
    gap: 3,
  },
  truthfulnessLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  truthfulnessText: {
    color: "#A9A9A9",
    fontSize: 12,
    fontWeight: "700",
  },
  voteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voteButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
  },
  truthVoteButton: {
    backgroundColor: "#F4F4F4",
    borderColor: "rgba(255, 255, 255, 0.72)",
  },
  falseVoteButton: {
    backgroundColor: "#2E2E2E",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  voteButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  voteButtonDisabled: {
    opacity: 0.62,
  },
  voteButtonText: {
    color: "#F7F7F7",
    fontSize: 14,
    fontWeight: "900",
  },
  truthVoteButtonText: {
    color: "#111111",
  },
  descriptionSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    gap: 10,
  },
  descriptionTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },
  descriptionText: {
    color: "#CFCFCF",
    fontSize: 16,
    lineHeight: 23,
  },
});
