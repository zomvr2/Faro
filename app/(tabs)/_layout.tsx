import { TabBarIcon } from "@/components/TabBarIcon";
import { MapCameraProvider, useMapCameraControls } from "@/components/map/MapCameraContext";
import {
  createReportDocument,
  getReportMediaPreviewUrl,
  listLatestReports,
  type ReportCategory,
  type ReportDocument,
  subscribeToReports,
  uploadReportMedia,
} from "@/services/appwrite";
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import * as Notifications from "expo-notifications";
import { Tabs, useRouter, useSegments } from "expo-router";
import {
  CameraIcon,
  ChevronsRightIcon,
  CircleAlertIcon,
  FlameIcon,
  ImageIcon,
  LightbulbIcon,
  LocateFixedIcon,
  MapIcon,
  PlusIcon,
  RssIcon,
  ShieldIcon,
  SirenIcon,
  TrafficConeIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 25;
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_SIDE_OFFSET = 16;
const TAB_BAR_MIN_BOTTOM = 20;
const MAP_CENTER_BUTTON_SIZE = 54;
const MAP_CENTER_BUTTON_GAP = 12;
const CATEGORY_CARD_WIDTH = 138;
const CATEGORY_CARD_GAP = 10;
const CATEGORY_SNAP_INTERVAL = CATEGORY_CARD_WIDTH + CATEGORY_CARD_GAP;
const MAX_REPORT_IMAGES = 3;
const NEARBY_REPORT_RADIUS_METERS = 500;

type SelectedMedia = {
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

type Coordinates = {
  lat: number;
  lng: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(from: Coordinates, to: Coordinates): number {
  const earthRadius = 6371000;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const haversineTerm =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversineTerm), Math.sqrt(1 - haversineTerm));

  return earthRadius * centralAngle;
}

export default function TabLayout() {
  return (
    <MapCameraProvider>
      <TabsContent />
    </MapCameraProvider>
  );
}

function TabsContent() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const addSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>("infrastructure");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [uploadProgressByUri, setUploadProgressByUri] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userCoordinatesRef = useRef<Coordinates | null>(null);
  const notifiedReportIdsRef = useRef<Set<string>>(new Set());
  const lastHandledNotificationIdRef = useRef<string | null>(null);
  const { canCenterOnUser, centerOnUser, isCenteredOnUser, isMapIntroActive } = useMapCameraControls();
  const tabBarBottom = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM);
  const isMapTabActive = segments.length === 1;

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
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refreshReports = async () => {
      try {
        const latestReports = await listLatestReports(100);
        if (isMounted) {
          setReports(latestReports);
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

        if (!report) {
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

  const showToast = useCallback((message: string) => {
    setToastMessage(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  }, []);

  const categories = useMemo(
    () => [
      { value: "security" as const, label: "Seguridad", Icon: ShieldIcon },
      { value: "traffic" as const, label: "Transito", Icon: TrafficConeIcon },
      { value: "infrastructure" as const, label: "Infraestructura", Icon: CircleAlertIcon },
      { value: "accident" as const, label: "Accidente", Icon: SirenIcon },
      { value: "waste" as const, label: "Basura", Icon: Trash2Icon },
      { value: "lighting" as const, label: "Problema de luz", Icon: LightbulbIcon },
      { value: "noise" as const, label: "Ruidos", Icon: Volume2Icon },
      { value: "fire" as const, label: "Incendio", Icon: FlameIcon },
    ],
    []
  );

  const openAddSheet = useCallback(() => {
    setSubmitError(null);
    addSheetRef.current?.present();
  }, []);

  const closeAddSheet = useCallback(() => {
    addSheetRef.current?.dismiss();
  }, []);

  const updateSelectedMedia = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) {
      return;
    }

    setSelectedMedia((previous) => {
      const availableSlots = Math.max(0, MAX_REPORT_IMAGES - previous.length);
      const mapped = assets.slice(0, availableSlots).map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? undefined,
        fileSize: asset.fileSize ?? undefined,
      }));

      return [...previous, ...mapped].slice(0, MAX_REPORT_IMAGES);
    });

    setUploadProgressByUri((previous) => {
      const next = { ...previous };

      assets.forEach((asset) => {
        if (asset.uri) {
          next[asset.uri] = 0;
        }
      });

      return next;
    });

    setSubmitError(null);
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    const remainingSlots = MAX_REPORT_IMAGES - selectedMedia.length;

    if (remainingSlots <= 0) {
      setSubmitError("Solo puedes subir hasta 3 imagenes.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setSubmitError("Permite acceso a la galeria para seleccionar imagenes.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    updateSelectedMedia(result.assets);
  }, [selectedMedia.length, updateSelectedMedia]);

  const handleTakePhoto = useCallback(async () => {
    if (selectedMedia.length >= MAX_REPORT_IMAGES) {
      setSubmitError("Solo puedes subir hasta 3 imagenes.");
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setSubmitError("Permite acceso a la camara para tomar una foto.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) {
      return;
    }

    updateSelectedMedia(result.assets);
  }, [selectedMedia.length, updateSelectedMedia]);

  const removeSelectedMedia = useCallback((indexToRemove: number) => {
    setSelectedMedia((previous) => {
      const mediaToRemove = previous[indexToRemove];

      if (mediaToRemove) {
        setUploadProgressByUri((progressMap) => {
          const next = { ...progressMap };
          delete next[mediaToRemove.uri];
          return next;
        });
      }

      return previous.filter((_, index) => index !== indexToRemove);
    });

    setSubmitError(null);
  }, []);

  const totalUploadProgress =
    selectedMedia.length > 0
      ? Math.round(
          selectedMedia.reduce((sum, media) => sum + (uploadProgressByUri[media.uri] ?? 0), 0) /
            selectedMedia.length
        )
      : 0;

  const handleSubmitReport = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setSubmitError("Agrega un titulo antes de publicar.");
      return;
    }

    if (!trimmedDescription) {
      setSubmitError("Agrega una descripcion antes de publicar.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const createdReport = await createReportDocument({
        title: trimmedTitle,
        category: selectedCategory,
        description: trimmedDescription,
        lng: location.coords.longitude,
        lat: location.coords.latitude,
        status: "active",
        images:
          selectedMedia.length > 0
            ? (
                await Promise.all(
                  selectedMedia.map(async (media) => {
                    const file = await uploadReportMedia({
                      uri: media.uri,
                      fileName: media.fileName,
                      mimeType: media.mimeType,
                      fileSize: media.fileSize,
                      onProgress: (progress) => {
                        setUploadProgressByUri((previous) => ({
                          ...previous,
                          [media.uri]: progress.progress,
                        }));
                      },
                    });

                    setUploadProgressByUri((previous) => ({
                      ...previous,
                      [media.uri]: 100,
                    }));

                    return getReportMediaPreviewUrl(file.$id);
                  })
                )
              ).join(",")
            : "",
      });

          notifiedReportIdsRef.current.add(createdReport.$id);

      setTitle("");
      setDescription("");
      setSelectedCategory("infrastructure");
      setSelectedMedia([]);
      setUploadProgressByUri({});
      closeAddSheet();
      showToast("Publicado");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo publicar el reporte.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [closeAddSheet, description, selectedCategory, selectedMedia, showToast, title]);

  return (
    <BottomSheetModalProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarLabelPosition: "beside-icon",
          tabBarShowLabel: false,
          tabBarStyle: isMapIntroActive
            ? { display: "none" }
            : {
                paddingBottom: 0,
                position: "absolute",
                left: TAB_BAR_SIDE_OFFSET,
                right: TAB_BAR_SIDE_OFFSET,
                bottom: tabBarBottom,
                borderRadius: 20,
                height: TAB_BAR_HEIGHT,
                marginHorizontal: 16,
                elevation: 6,
                backgroundColor: "rgb(0, 0, 0, 0.8)",
              },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon Icon={MapIcon} color={color} focused={focused} size={ICON_SIZE} />
            ),
            animation: "fade"
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "Add",
            tabBarIcon: () => null,
            tabBarButton: ({ accessibilityState, accessibilityLabel, testID }) => (
              <Pressable
                onPress={openAddSheet}
                accessibilityState={accessibilityState}
                accessibilityLabel={accessibilityLabel}
                testID={testID}
                style={({ pressed }) => ({
                  top: -18,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: "#00C8FF",
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 8,
                  }}
                >
                  <PlusIcon size={26} color="#00131A" />
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="rss"
          options={{
            title: "RSS",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon Icon={RssIcon} color={color} focused={focused} size={ICON_SIZE} />
            ),
            tabBarBadge: hasNearbyReports ? " " : undefined,
            tabBarBadgeStyle: {
              minWidth: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: "#FF4D4D",
              top: -8,
              aspectRatio: 1
            },
            animation: "fade",
          }}
        />
      </Tabs>

      {canCenterOnUser && !isMapIntroActive && isMapTabActive ? (
        <Pressable
          onPress={centerOnUser}
          accessibilityRole="button"
          accessibilityLabel="Centrar mapa en mi ubicacion"
          style={({ pressed }) => ({
            position: "absolute",
            right: TAB_BAR_SIDE_OFFSET,
            bottom: tabBarBottom + TAB_BAR_HEIGHT + MAP_CENTER_BUTTON_GAP,
            width: MAP_CENTER_BUTTON_SIZE,
            height: MAP_CENTER_BUTTON_SIZE,
            borderRadius: MAP_CENTER_BUTTON_SIZE / 3,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            borderWidth: 1,
            borderColor: "rgba(167, 184, 207, 0.4)",
            elevation: 9,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <LocateFixedIcon size={24} color={isCenteredOnUser ? "#25C7FF" : "#7E95B2"} />
        </Pressable>
      ) : null}

      <BottomSheetModal
        ref={addSheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: "#141414",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
        }}
        handleIndicatorStyle={{
          width: 38,
          height: 4,
          borderRadius: 999,
          backgroundColor: "rgba(245, 248, 255, 0.34)",
        }}
      >
        <BottomSheetScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={{
            paddingHorizontal: 16,
          }}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom + 14, 28),
            gap: 16,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  backgroundColor: "#F4F4F4",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: "#111111", fontSize: 11, fontWeight: "900" }}>Nuevo reporte</Text>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "900", lineHeight: 34 }}>
                Publicar incidente
              </Text>
              <Text style={{ color: "#A5A5A5", fontSize: 14, fontWeight: "600", lineHeight: 20 }}>
                Cuentanos que pasa para ayudar a la comunidad.
              </Text>
            </View>
            <Pressable
              onPress={closeAddSheet}
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#242424",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <XIcon color="#EDEDED" size={20} />
            </Pressable>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#9E9E9E",
                fontSize: 12,
                letterSpacing: 0.8,
                fontWeight: "900",
                textTransform: "uppercase",
              }}
            >
              Titulo
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Semaforo apagado en Av. Balmaceda"
              placeholderTextColor="#707070"
              maxLength={120}
              style={{
                minHeight: 50,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                backgroundColor: "#1F1F1F",
                color: "#F4F4F4",
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 15,
                fontWeight: "700",
              }}
            />
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#9E9E9E",
                fontSize: 12,
                letterSpacing: 0.8,
                fontWeight: "900",
                textTransform: "uppercase",
              }}
            >
              Categoria del incidente
            </Text>

            <GestureScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CATEGORY_SNAP_INTERVAL}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={{ paddingRight: CATEGORY_CARD_GAP }}
            >
              {categories.map(({ value, label, Icon }, index) => {
                const isSelected = selectedCategory === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setSelectedCategory(value)}
                    style={{
                      width: CATEGORY_CARD_WIDTH,
                      height: 66,
                      borderRadius: 16,
                      backgroundColor: isSelected ? "#F4F4F4" : "#1F1F1F",
                      borderWidth: 1,
                      borderColor: isSelected ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.1)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingHorizontal: 10,
                      gap: 8,
                      marginRight: index === categories.length - 1 ? 0 : CATEGORY_CARD_GAP,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "#111111" : "rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <Icon color={isSelected ? "#F4F4F4" : "#D8D8D8"} size={17} />
                    </View>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: isSelected ? "#111111" : "#E2E2E2",
                        fontWeight: "900",
                        fontSize: 12,
                        flex: 1,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </GestureScrollView>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                paddingRight: 4,
              }}
            >
              <Text style={{ color: "#8E8E8E", fontSize: 12, fontWeight: "700" }}>
                Desliza para ver mas categorias
              </Text>
              <ChevronsRightIcon color="#D8D8D8" size={14} />
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#9E9E9E",
                fontSize: 12,
                letterSpacing: 0.8,
                fontWeight: "900",
                textTransform: "uppercase",
              }}
            >
              Descripcion
            </Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe brevemente el incidente..."
              placeholderTextColor="#707070"
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 112,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                backgroundColor: "#1F1F1F",
                color: "#F4F4F4",
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                fontWeight: "600",
                lineHeight: 21,
              }}
            />
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#9E9E9E",
                fontSize: 12,
                letterSpacing: 0.8,
                fontWeight: "900",
                textTransform: "uppercase",
              }}
            >
              Evidencia visual
            </Text>

            <View
              style={{
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: 18,
                paddingVertical: 16,
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#1F1F1F",
                paddingHorizontal: 12,
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#2B2B2B",
                }}
              >
                <UploadIcon color="#F4F4F4" size={20} />
              </View>
              <Text style={{ color: "#F4F4F4", fontSize: 17, fontWeight: "900" }}>Tomar foto o subir</Text>
              <Text style={{ color: "#9A9A9A", fontSize: 13, fontWeight: "700" }}>
                {selectedMedia.length}/{MAX_REPORT_IMAGES} imagenes seleccionadas
              </Text>

              <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                <Pressable
                  onPress={() => {
                    void handleTakePhoto();
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    backgroundColor: "#2A2A2A",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  <CameraIcon size={16} color="#F2F2F2" />
                  <Text style={{ color: "#F2F2F2", fontWeight: "900" }}>Camara</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    void handlePickFromLibrary();
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    backgroundColor: "#2A2A2A",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  <ImageIcon size={16} color="#F2F2F2" />
                  <Text style={{ color: "#F2F2F2", fontWeight: "900" }}>Galeria</Text>
                </Pressable>
              </View>

              {selectedMedia.length > 0 ? (
                <GestureScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 2 }}
                  style={{ width: "100%" }}
                >
                  {selectedMedia.map((media, index) => (
                    <View key={`${media.uri}-${index}`} style={{ width: 88, height: 88 }}>
                      <Image
                        source={{ uri: media.uri }}
                        style={{ width: 88, height: 88, borderRadius: 14, backgroundColor: "#2A2A2A" }}
                        contentFit="cover"
                      />

                      {isSubmitting ? (
                        <View
                          style={{
                            position: "absolute",
                            left: 6,
                            right: 6,
                            bottom: 6,
                            gap: 4,
                          }}
                        >
                          <View
                            style={{
                              height: 5,
                              borderRadius: 999,
                              backgroundColor: "rgba(0, 0, 0, 0.45)",
                              overflow: "hidden",
                            }}
                          >
                            <View
                              style={{
                                width: `${Math.min(100, Math.max(0, uploadProgressByUri[media.uri] ?? 0))}%`,
                                height: "100%",
                                backgroundColor: "#F4F4F4",
                              }}
                            />
                          </View>
                          <Text style={{ color: "#F4F4F4", fontSize: 11, fontWeight: "900", textAlign: "right" }}>
                            {Math.round(uploadProgressByUri[media.uri] ?? 0)}%
                          </Text>
                        </View>
                      ) : null}

                      <Pressable
                        onPress={() => removeSelectedMedia(index)}
                        disabled={isSubmitting}
                        hitSlop={10}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: "rgba(0, 0, 0, 0.74)",
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.18)",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: isSubmitting ? 0.45 : 1,
                        }}
                      >
                        <XIcon size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </GestureScrollView>
              ) : null}

              {isSubmitting && selectedMedia.length > 0 ? (
                <Text style={{ color: "#D8D8D8", fontSize: 12, fontWeight: "900" }}>
                  Subiendo imagenes: {totalUploadProgress}%
                </Text>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={() => {
              void handleSubmitReport();
            }}
            disabled={isSubmitting}
            style={{
              height: 52,
              borderRadius: 999,
              backgroundColor: isSubmitting ? "#AFAFAF" : "#F4F4F4",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "row",
              gap: 9,
              marginTop: 6,
              opacity: isSubmitting ? 0.85 : 1,
            }}
          >
            <UploadIcon color="#111111" size={18} />
            <Text style={{ color: "#111111", fontWeight: "900", fontSize: 16 }}>
              {isSubmitting ? "Publicando..." : "Publicar Reporte"}
            </Text>
          </Pressable>

          {submitError ? <Text style={{ color: "#FF8C8C", fontSize: 13, fontWeight: "800" }}>{submitError}</Text> : null}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {toastMessage ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: tabBarBottom + TAB_BAR_HEIGHT + 24,
            alignItems: "center",
          }}
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: "rgba(16, 186, 113, 0.95)",
            }}
          >
            <Text style={{ color: "#032313", fontWeight: "800", fontSize: 13 }}>{toastMessage}</Text>
          </View>
        </View>
      ) : null}
    </BottomSheetModalProvider>
  )
}
