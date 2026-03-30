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
import { Tabs } from "expo-router";
import {
  CameraIcon,
  ChevronsRightIcon,
  CircleAlertIcon,
  DropletsIcon,
  ImageIcon,
  LightbulbIcon,
  LocateFixedIcon,
  MapIcon,
  PawPrintIcon,
  PlusIcon,
  RssIcon,
  ShieldIcon,
  TrafficConeIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 25;
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_SIDE_OFFSET = 16;
const TAB_BAR_MIN_BOTTOM = 20;
const MAP_CENTER_BUTTON_SIZE = 54;
const MAP_CENTER_BUTTON_GAP = 12;
const CATEGORY_CARD_WIDTH = 160;
const CATEGORY_CARD_GAP = 12;
const CATEGORY_SNAP_INTERVAL = CATEGORY_CARD_WIDTH + CATEGORY_CARD_GAP;
const MAX_REPORT_IMAGES = 3;
const NEARBY_REPORT_RADIUS_METERS = 1000;

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
  const insets = useSafeAreaInsets();
  const addSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["100%"], []);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>("infrastructure");
  const [description, setDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [uploadProgressByUri, setUploadProgressByUri] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { canCenterOnUser, centerOnUser, isCenteredOnUser, isMapIntroActive } = useMapCameraControls();
  const tabBarBottom = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM);

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
      unsubscribe = subscribeToReports(() => {
        void refreshReports();
      });
    } catch {
      // Keep app usable if realtime channel is unavailable.
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

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
      { value: "animals" as const, label: "Mascotas", Icon: PawPrintIcon },
      { value: "waste" as const, label: "Basura", Icon: Trash2Icon },
      { value: "lighting" as const, label: "Alumbrado", Icon: LightbulbIcon },
      { value: "noise" as const, label: "Ruidos", Icon: Volume2Icon },
      { value: "water" as const, label: "Agua", Icon: DropletsIcon },
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
    const trimmedDescription = description.trim();

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

      await createReportDocument({
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
  }, [closeAddSheet, description, selectedCategory, selectedMedia, showToast]);

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

      {canCenterOnUser && !isMapIntroActive ? (
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
        enablePanDownToClose
        enableContentPanningGesture={false}
        backgroundStyle={{ backgroundColor: "rgba(0, 0, 0, 0.94)" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(167, 184, 207, 0.55)" }}
      >
        <BottomSheetScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 20),
            gap: 15,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ gap: 6, width: "70%" }}>
              <Text style={{ color: "#E7F0FF", fontSize: 32, fontWeight: "800" }}>Nuevo Reporte</Text>
              <Text style={{ color: "#91A8C2", fontSize: 15, fontWeight: "500" }}>
                Cuentanos que pasa para ayudar a la comunidad.
              </Text>
            </View>
            <Pressable
              onPress={closeAddSheet}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <XIcon color="#A7B8CF" size={20} />
            </Pressable>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#25C7FF",
                fontSize: 12,
                letterSpacing: 1.6,
                fontWeight: "700",
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
                      height: 84,
                      borderRadius: 16,
                      backgroundColor: isSelected ? "#15254A" : "rgba(255, 255, 255, 0.05)",
                      borderWidth: 1.5,
                      borderColor: isSelected ? "#00C8FF" : "rgba(167, 184, 207, 0.24)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingHorizontal: 14,
                      gap: 10,
                      marginRight: index === categories.length - 1 ? 0 : CATEGORY_CARD_GAP,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "rgba(0, 200, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <Icon color={isSelected ? "#00C8FF" : "#C8D8F2"} size={18} />
                    </View>
                    <Text style={{ color: "#C8D8F2", fontWeight: "600", fontSize: 13 }}>{label}</Text>
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
              <Text style={{ color: "#7E95B2", fontSize: 12, fontWeight: "600" }}>
                Desliza para ver mas categorias
              </Text>
              <ChevronsRightIcon color="#25C7FF" size={14} />
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#25C7FF",
                fontSize: 12,
                letterSpacing: 1.6,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              Descripcion
            </Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe brevemente el incidente..."
              placeholderTextColor="#7E95B2"
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 120,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "rgba(125, 160, 195, 0.5)",
                backgroundColor: "rgba(14, 34, 70, 0.4)",
                color: "#D7E5FB",
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
              }}
            />
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#25C7FF",
                fontSize: 12,
                letterSpacing: 1.6,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              Evidencia visual
            </Text>

            <View
              style={{
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "rgba(125, 160, 195, 0.5)",
                borderRadius: 18,
                paddingVertical: 20,
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                backgroundColor: "rgba(14, 34, 70, 0.4)",
                paddingHorizontal: 12,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(37, 199, 255, 0.16)",
                }}
              >
                <UploadIcon color="#25C7FF" size={22} />
              </View>
              <Text style={{ color: "#D7E5FB", fontSize: 17, fontWeight: "700" }}>Tomar foto o subir</Text>
              <Text style={{ color: "#7E95B2", fontSize: 14 }}>
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
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(167, 184, 207, 0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  <CameraIcon size={16} color="#D7E5FB" />
                  <Text style={{ color: "#D7E5FB", fontWeight: "700" }}>Camara</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    void handlePickFromLibrary();
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(167, 184, 207, 0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  <ImageIcon size={16} color="#D7E5FB" />
                  <Text style={{ color: "#D7E5FB", fontWeight: "700" }}>Galeria</Text>
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
                    <View key={`${media.uri}-${index}`} style={{ width: 96, height: 96 }}>
                      <Image
                        source={{ uri: media.uri }}
                        style={{ width: 96, height: 96, borderRadius: 12 }}
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
                                backgroundColor: "#25C7FF",
                              }}
                            />
                          </View>
                          <Text style={{ color: "#E7F0FF", fontSize: 11, fontWeight: "700", textAlign: "right" }}>
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
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
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
                <Text style={{ color: "#9BC7FF", fontSize: 12, fontWeight: "700" }}>
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
              height: 56,
              borderRadius: 16,
              backgroundColor: isSubmitting ? "#61AFC1" : "#00C8FF",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "row",
              gap: 10,
              marginTop: 12,
              opacity: isSubmitting ? 0.85 : 1,
            }}
          >
            <UploadIcon color="#00131A" size={18} />
            <Text style={{ color: "#00131A", fontWeight: "800", fontSize: 18 }}>
              {isSubmitting ? "Publicando..." : "Publicar Reporte"}
            </Text>
          </Pressable>

          {submitError ? <Text style={{ color: "#FF8C8C", fontSize: 13, fontWeight: "600" }}>{submitError}</Text> : null}
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