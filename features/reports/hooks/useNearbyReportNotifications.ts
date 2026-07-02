import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ExpoLocation from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";

import {
  listLatestReports,
  subscribeToReports,
  type ReportDocument,
} from "@/services/appwrite";
import { getDistanceMeters, type Coordinates } from "@/shared/geo/distance";
import { isCoordinatesInServiceArea } from "@/shared/geo/serviceArea";

const NEARBY_REPORT_RADIUS_METERS = 500;

export function useNearbyReportNotifications() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const userCoordinatesRef = useRef<Coordinates | null>(null);
  const notifiedReportIdsRef = useRef<Set<string>>(new Set());
  const lastHandledNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    userCoordinatesRef.current = userCoordinates;
  }, [userCoordinates]);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const configureNotifications = async () => {
      try {
        const permissions = await Notifications.requestPermissionsAsync();

        if (!permissions.granted) {
          return;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("nearby-reports", {
            name: "Reportes cercanos",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          });
        }
      } catch {
        // Keep app usable if notifications are unavailable.
      }
    };

    void configureNotifications();
  }, []);

  const markReportNotified = useCallback((reportId: string) => {
    notifiedReportIdsRef.current.add(reportId);
  }, []);

  const notifyNearbyReport = useCallback(async (report: ReportDocument) => {
    if (notifiedReportIdsRef.current.has(report.$id)) {
      return;
    }

    notifiedReportIdsRef.current.add(report.$id);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Nuevo reporte cercano",
          body: report.title?.trim() || "Se registro un incidente cerca de tu ubicacion.",
          data: {
            reportId: report.$id,
            lat: report.lat,
            lng: report.lng,
          },
        },
        trigger: null,
      });
    } catch {
      // Ignore scheduling errors so realtime updates continue working.
    }
  }, []);

  const openReportFromNotification = useCallback(
    (response: Notifications.NotificationResponse | null) => {
      if (!response) {
        return;
      }

      const notificationId = response.notification.request.identifier;

      if (lastHandledNotificationIdRef.current === notificationId) {
        return;
      }

      const data = response.notification.request.content.data;
      const reportId = typeof data?.reportId === "string" ? data.reportId : null;

      if (!reportId) {
        return;
      }

      lastHandledNotificationIdRef.current = notificationId;

      const lat = typeof data?.lat === "number" || typeof data?.lat === "string" ? String(data.lat) : undefined;
      const lng = typeof data?.lng === "number" || typeof data?.lng === "string" ? String(data.lng) : undefined;

      router.push({
        pathname: "/(tabs)",
        params: {
          focus: Date.now().toString(),
          reportId,
          lat,
          lng,
        },
      });
    },
    [router]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openReportFromNotification(response);
    });

    const syncLastResponse = async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        openReportFromNotification(lastResponse);
      } catch {
        // Ignore response sync failures to avoid blocking app startup.
      }
    };

    void syncLastResponse();

    return () => {
      subscription.remove();
    };
  }, [openReportFromNotification]);

  useEffect(() => {
    let isMounted = true;

    const refreshReports = async () => {
      try {
        const latestReports = await listLatestReports(100);
        if (isMounted) {
          setReports(latestReports.filter((report) => isCoordinatesInServiceArea(report)));
        }
      } catch {
        // Ignore badge refresh errors so tab navigation remains unaffected.
      }
    };

    void refreshReports();

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToReports((event) => {
        void refreshReports();

        const isCreateEvent = event.events.some((name) => name.endsWith(".create"));

        if (!isCreateEvent) {
          return;
        }

        const report = event.payload;

        if (!report || !isCoordinatesInServiceArea(report)) {
          return;
        }

        const coordinates = userCoordinatesRef.current;

        if (!coordinates) {
          return;
        }

        const distance = getDistanceMeters(coordinates, {
          lat: report.lat,
          lng: report.lng,
        });

        if (distance > NEARBY_REPORT_RADIUS_METERS) {
          return;
        }

        void notifyNearbyReport(report);
      });
    } catch {
      // Keep app usable if realtime channel is unavailable.
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [notifyNearbyReport]);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: ExpoLocation.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      try {
        const permission = await ExpoLocation.requestForegroundPermissionsAsync();

        if (!permission.granted || !isMounted) {
          return;
        }

        const position = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });

        if (isMounted) {
          setUserCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }

        locationSubscription = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.Balanced,
            distanceInterval: 100,
            timeInterval: 60000,
          },
          (updatedPosition) => {
            setUserCoordinates({
              lat: updatedPosition.coords.latitude,
              lng: updatedPosition.coords.longitude,
            });
          }
        );
      } catch {
        // Ignore location failures; badge will simply stay hidden.
      }
    };

    void startLocationTracking();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, []);

  const hasNearbyReports = useMemo(() => {
    if (!userCoordinates || reports.length === 0) {
      return false;
    }

    return reports.some((report) => {
      const reportCoordinates = {
        lat: report.lat,
        lng: report.lng,
      };

      return getDistanceMeters(userCoordinates, reportCoordinates) <= NEARBY_REPORT_RADIUS_METERS;
    });
  }, [reports, userCoordinates]);

  return {
    hasNearbyReports,
    markReportNotified,
  };
}
