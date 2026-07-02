import { useEffect, useRef, type RefObject } from "react";
import { type CameraRef } from "@maplibre/maplibre-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { ReportDocument } from "@/services/appwrite";
import { isLngLatInServiceArea } from "@/shared/geo/serviceArea";

type UseReportFocusParamsInput = {
  cameraRef: RefObject<CameraRef | null>;
  focusDuration: number;
  focusPitch: number;
  focusZoom: number;
  onOpenReport: (report: ReportDocument) => void;
  queueTimer: (callback: () => void, delayMs: number) => void;
  reports: ReportDocument[];
  setFollowUserLocationMode: (shouldFollowUserLocation: boolean) => void;
  setIsCenteredOnUser: (isCenteredOnUser: boolean) => void;
};

export function useReportFocusParams({
  cameraRef,
  focusDuration,
  focusPitch,
  focusZoom,
  onOpenReport,
  queueTimer,
  reports,
  setFollowUserLocationMode,
  setIsCenteredOnUser,
}: UseReportFocusParamsInput) {
  const params = useLocalSearchParams<{ focus?: string; reportId?: string; lat?: string; lng?: string }>();
  const router = useRouter();
  const lastHandledFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!params.focus) {
      return;
    }

    const focusKey = String(params.focus);

    if (lastHandledFocusRef.current === focusKey) {
      return;
    }

    const targetReportId = params.reportId ? String(params.reportId) : null;
    const targetLat = params.lat ? Number(params.lat) : Number.NaN;
    const targetLng = params.lng ? Number(params.lng) : Number.NaN;
    const hasValidCoordinates = Number.isFinite(targetLat) && Number.isFinite(targetLng);

    const targetReport = targetReportId
      ? reports.find((report) => report.$id === targetReportId) ?? null
      : null;

    if (!targetReport && targetReportId) {
      return;
    }

    const centerCoordinate: GeoJSON.Position | null = targetReport
      ? [targetReport.lng, targetReport.lat]
      : hasValidCoordinates
        ? [targetLng, targetLat]
        : null;

    if (!centerCoordinate || !isLngLatInServiceArea(centerCoordinate)) {
      lastHandledFocusRef.current = focusKey;
      router.setParams({ focus: undefined, reportId: undefined, lat: undefined, lng: undefined });
      return;
    }

    const frameId = requestAnimationFrame(() => {
      lastHandledFocusRef.current = focusKey;
      setFollowUserLocationMode(false);
      setIsCenteredOnUser(false);

      cameraRef.current?.flyTo({
        center: centerCoordinate as [number, number],
        zoom: focusZoom,
        pitch: focusPitch,
        duration: focusDuration,
      });

      if (targetReport) {
        queueTimer(() => {
          onOpenReport(targetReport);
        }, focusDuration + 60);
      }

      router.setParams({ focus: undefined, reportId: undefined, lat: undefined, lng: undefined });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    cameraRef,
    focusDuration,
    focusPitch,
    focusZoom,
    onOpenReport,
    params.focus,
    params.lat,
    params.lng,
    params.reportId,
    queueTimer,
    reports,
    router,
    setFollowUserLocationMode,
    setIsCenteredOnUser,
  ]);
}
