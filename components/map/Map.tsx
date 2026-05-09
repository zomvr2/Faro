import {
    getReportImageUrls,
    listLatestReports,
    subscribeToReports,
    type ReportCategory,
    type ReportDocument,
} from '@/services/appwrite';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
    Camera,
    MapView,
    MarkerView,
    UserLocation,
    UserTrackingMode,
    type CameraRef,
    type Location as MapLocation,
} from '@maplibre/maplibre-react-native';
import * as ExpoLocation from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Calendar,
    CheckIcon,
    CircleAlertIcon,
    FlameIcon,
    ImageIcon,
    LightbulbIcon,
    MapPin,
    ShieldIcon,
    SirenIcon,
    TrafficConeIcon,
    Trash2Icon,
    UsersIcon,
    Volume2Icon,
    XIcon,
    type LucideIcon,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useMapCameraControls } from './MapCameraContext';

const OVERVIEW_COORDINATE: GeoJSON.Position = [-71.29, -29.95];
const OVERVIEW_ZOOM_LEVEL = 10;
const USER_ZOOM_LEVEL = 16;
const USER_PITCH = 45;
const INTRO_DELAY_MS = 250;
const INTRO_FLY_DURATION_MS = 1800;
const RECENTER_FLY_DURATION_MS = 900;
const LOGO_FADE_IN_DURATION_MS = 550;
const LOGO_HOLD_DURATION_MS = 280;
const LOGO_FADE_OUT_DURATION_MS = 260;
const INTRO_LOGO_SIZE = 240;
const INTRO_MAX_WAIT_MS = 5000;

const EARTH_RADIUS_METERS = 6371000;

const CATEGORY_MARKER_STYLES: Record<
  ReportCategory,
  { label: string; color: string; Icon: LucideIcon }
> = {
  security: { label: 'SEGURIDAD', color: '#00B7FF', Icon: UsersIcon },
  traffic: { label: 'TRÁNSITO', color: '#C91F32', Icon: CircleAlertIcon },
  infrastructure: { label: 'INFRAESTRUCTURA', color: '#E2A712', Icon: TrafficConeIcon },
  lighting: { label: 'PROBLEMA DE LUZ', color: '#F5C648', Icon: LightbulbIcon },
  waste: { label: 'BASURA', color: '#4EBB68', Icon: Trash2Icon },
  fire: { label: 'INCENDIO', color: '#FF6A3D', Icon: FlameIcon },
  noise: { label: 'RUIDOS', color: '#8D6ADE', Icon: Volume2Icon },
  accident: { label: 'ACCIDENTE', color: '#A44A4A', Icon: SirenIcon },
};

const STATUS_STYLES: Record<string, { label: string; color: string; Icon: LucideIcon }> = {
  active: { label: 'ACTIVO', color: '#F5C648', Icon: CircleAlertIcon },
  solved: { label: 'SOLUCIONADO', color: '#4EBB68', Icon: CheckIcon },
  false: { label: 'FALSO', color: '#C91F32', Icon: XIcon },
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(from: GeoJSON.Position, to: GeoJSON.Position): number {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const fromLatRad = toRadians(fromLat);
  const toLatRad = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.max(1, Math.round(distanceMeters))} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatReportDate(isoDate: string): string {
  const timestamp = Date.parse(isoDate);

  if (Number.isNaN(timestamp)) {
    return 'Sin fecha';
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Hace unos segundos';
  }

  if (diffMins < 60) {
    return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  }

  if (diffHours < 24) {
    return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }

  if (diffDays < 7) {
    return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
  }).format(new Date(timestamp));
}

export default function Map() {
  const cameraRef = useRef<CameraRef>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const galleryListRef = useRef<FlatList<string>>(null);
  const lastHandledFocusRef = useRef<string | null>(null);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestUserCoordinateRef = useRef<GeoJSON.Position | null>(null);
  const { width: galleryWidth, height: galleryHeight } = useWindowDimensions();
  const introLogoOpacity = useRef(new Animated.Value(0)).current;
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [showIntroLogo, setShowIntroLogo] = useState(false);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userCoordinate, setUserCoordinate] = useState<GeoJSON.Position | null>(null);
  const params = useLocalSearchParams<{ focus?: string; reportId?: string; lat?: string; lng?: string }>();
  const router = useRouter();
  const { registerCenterOnUser, setIsCenteredOnUser, setIsMapIntroActive } = useMapCameraControls();

  useEffect(() => {
    const loadReports = async () => {
      try {
        const latestReports = await listLatestReports(120);
        setReports(latestReports);
      } catch {
        // Keep the map usable even if report loading fails.
      }
    };

    void loadReports();

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToReports(() => {
        void loadReports();
      });
    } catch {
      // Realtime can fail if env is missing; fallback to initial load only.
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setIsMapIntroActive(false);
        Alert.alert(
          'Location permission required',
          'Enable location permissions to use live tracking and heading.'
        );
      }
    };

    requestPermissions();
  }, [setIsMapIntroActive]);

  useEffect(() => {
    return () => {
      introTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      introTimersRef.current = [];
    };
  }, []);

  const queueIntroTimer = useCallback((callback: () => void, delayMs: number) => {
    const timerId = setTimeout(callback, delayMs);
    introTimersRef.current.push(timerId);
  }, []);

  useEffect(() => {
    setIsMapIntroActive(true);

    queueIntroTimer(() => {
      setIsMapIntroActive(false);
    }, INTRO_MAX_WAIT_MS);
  }, [queueIntroTimer, setIsMapIntroActive]);

  const startCameraIntro = useCallback((coordinate: GeoJSON.Position) => {
    queueIntroTimer(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: coordinate,
        zoomLevel: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        animationMode: 'flyTo',
        animationDuration: INTRO_FLY_DURATION_MS,
      });

      queueIntroTimer(() => {
        setFollowUserLocation(true);
        setIsCenteredOnUser(true);
        setIsMapIntroActive(false);
      }, INTRO_FLY_DURATION_MS);
    }, INTRO_DELAY_MS);
  }, [queueIntroTimer, setIsCenteredOnUser, setIsMapIntroActive]);

  const handleUserLocationUpdate = useCallback((location: MapLocation) => {
    const liveUserCoordinate: GeoJSON.Position = [location.coords.longitude, location.coords.latitude];

    latestUserCoordinateRef.current = liveUserCoordinate;
    setUserCoordinate(liveUserCoordinate);

    if (introStarted) {
      return;
    }

    setIntroStarted(true);
    setIsMapIntroActive(true);
    setShowIntroLogo(true);
    introLogoOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(introLogoOpacity, {
        toValue: 1,
        duration: LOGO_FADE_IN_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(LOGO_HOLD_DURATION_MS),
      Animated.timing(introLogoOpacity, {
        toValue: 0,
        duration: LOGO_FADE_OUT_DURATION_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setShowIntroLogo(false);
      startCameraIntro(liveUserCoordinate);
    });
  }, [introLogoOpacity, introStarted, setIsMapIntroActive, startCameraIntro]);

  const handleRegionWillChange = useCallback((event: any) => {
    // Only disable follow mode for direct user map interactions.
    const isUserInteraction = event?.properties?.isUserInteraction === true;

    if (!isUserInteraction) {
      return;
    }

    setFollowUserLocation(false);
    setIsCenteredOnUser(false);
  }, [setIsCenteredOnUser]);

  const centerCameraOnUser = useCallback(async () => {
    let coordinate = latestUserCoordinateRef.current;

    if (!coordinate) {
      try {
        const location = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });

        coordinate = [location.coords.longitude, location.coords.latitude];
        latestUserCoordinateRef.current = coordinate;
      } catch {
        Alert.alert('Unable to center map', 'Could not get your current location.');
        return;
      }
    }

    // Force a manual camera move first, then re-enable follow mode.
    setFollowUserLocation(false);

    requestAnimationFrame(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: coordinate,
        zoomLevel: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        animationMode: 'flyTo',
        animationDuration: RECENTER_FLY_DURATION_MS,
      });

      queueIntroTimer(() => {
        setFollowUserLocation(true);
        setIsCenteredOnUser(true);
      }, RECENTER_FLY_DURATION_MS + 50);
    });
  }, [queueIntroTimer, setIsCenteredOnUser]);

  useEffect(() => {
    registerCenterOnUser(centerCameraOnUser);

    return () => {
      setIsMapIntroActive(false);
      registerCenterOnUser(null);
    };
  }, [centerCameraOnUser, registerCenterOnUser, setIsMapIntroActive]);

  const visibleReports = reports.filter((report) =>
    Number.isFinite(report.lat) && Number.isFinite(report.lng)
  );

  const bottomSheetSnapPoints = ['55%', '92%'];

  const closeReportModal = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const openReportModal = useCallback((report: ReportDocument) => {
    setSelectedReport(report);
    requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });
  }, []);

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

    if (!centerCoordinate) {
      lastHandledFocusRef.current = focusKey;
      router.setParams({ focus: undefined, reportId: undefined, lat: undefined, lng: undefined });
      return;
    }

    lastHandledFocusRef.current = focusKey;
    setFollowUserLocation(false);
    setIsCenteredOnUser(false);

    cameraRef.current?.setCamera({
      centerCoordinate,
      zoomLevel: USER_ZOOM_LEVEL,
      pitch: USER_PITCH,
      animationMode: 'flyTo',
      animationDuration: RECENTER_FLY_DURATION_MS,
    });

    if (targetReport) {
      queueIntroTimer(() => {
        openReportModal(targetReport);
      }, RECENTER_FLY_DURATION_MS + 60);
    }

    router.setParams({ focus: undefined, reportId: undefined, lat: undefined, lng: undefined });
  }, [openReportModal, params.focus, params.lat, params.lng, params.reportId, queueIntroTimer, reports, router, setIsCenteredOnUser]);

  const handleBottomSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setSelectedReport(null);
      setIsGalleryVisible(false);
      setSelectedImageIndex(0);
    }
  }, []);

  const renderBottomSheetBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior='close'
      opacity={0.48}
    />
  ), []);

  const selectedReportDistance = selectedReport && userCoordinate
    ? formatDistance(haversineDistanceMeters(userCoordinate, [selectedReport.lng, selectedReport.lat]))
    : 'No disponible';

  const selectedReportImages = selectedReport ? getReportImageUrls(selectedReport) : [];

  const selectedMarkerStyle = selectedReport
    ? CATEGORY_MARKER_STYLES[selectedReport.category] ?? {
      label: selectedReport.category.toUpperCase(),
      color: '#00B7FF',
      Icon: ShieldIcon,
    }
    : null;

  const selectedStatusStyle = selectedReport
    ? STATUS_STYLES[selectedReport.status] ?? {
      label: selectedReport.status.toUpperCase(),
      color: '#8FA7BD',
      Icon: ShieldIcon,
    }
    : null;

  const openGalleryAtIndex = useCallback((index: number) => {
    if (selectedReportImages.length === 0) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(index, selectedReportImages.length - 1));
    setSelectedImageIndex(safeIndex);
    setIsGalleryVisible(true);
  }, [selectedReportImages.length]);

  const closeGallery = useCallback(() => {
    setIsGalleryVisible(false);
  }, []);

  useEffect(() => {
    if (!isGalleryVisible || selectedReportImages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      galleryListRef.current?.scrollToIndex({
        index: selectedImageIndex,
        animated: false,
      });
    });
  }, [isGalleryVisible, selectedImageIndex, selectedReportImages.length]);

  return (
    <View style={styles.container}>
      <MapView
        attributionEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onRegionWillChange={handleRegionWillChange}
        style={styles.map}
        tintColor="#1eaae1"
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: OVERVIEW_COORDINATE,
            zoomLevel: OVERVIEW_ZOOM_LEVEL,
            animationMode: 'flyTo',
            animationDuration: 1200,
          }}
          followUserLocation={followUserLocation}
          followUserMode={UserTrackingMode.Follow}
          followZoomLevel={USER_ZOOM_LEVEL}
          followPitch={USER_PITCH}
        />

        <UserLocation
          onUpdate={handleUserLocationUpdate}
          showsUserHeadingIndicator
          renderMode='native'
          androidRenderMode='compass'
        />

        {visibleReports.map((report) => {
          const markerStyle = CATEGORY_MARKER_STYLES[report.category] ?? {
            label: report.category.toUpperCase(),
            color: '#00B7FF',
            Icon: ShieldIcon,
          };

          return (
            <MarkerView
              key={report.$id}
              coordinate={[report.lng, report.lat]}
              anchor={{ x: 0.5, y: 1 }}
              allowOverlap
              onTouchEnd={() => openReportModal(report)}
            >
              <View collapsable={false} style={styles.markerContainer}>
                <View style={[styles.markerIconCircle, { backgroundColor: markerStyle.color }]}> 
                  <markerStyle.Icon size={14} color='#06121E' strokeWidth={2.4} />
                </View>

                <View style={styles.markerLabelPill}>
                  <Text numberOfLines={1} style={styles.markerLabelText}>
                    {markerStyle.label}
                  </Text>
                </View>

                <View style={styles.markerTip} />
              </View>
            </MarkerView>
          );
        })}
      </MapView>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={1}
        snapPoints={bottomSheetSnapPoints}
        onChange={handleBottomSheetChange}
        enablePanDownToClose
        backdropComponent={renderBottomSheetBackdrop}
        handleIndicatorStyle={styles.bottomSheetHandle}
        backgroundStyle={styles.bottomSheetBackground}
      >
        {selectedReport && selectedMarkerStyle ? (
          <BottomSheetScrollView
            contentContainerStyle={styles.bottomSheetContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailsHeader}>
              <View style={styles.headerTitleSection}>
                <View style={[styles.categoryBadge, { backgroundColor: selectedMarkerStyle.color }]}>
                  <selectedMarkerStyle.Icon size={12} color='#06121E' strokeWidth={2.8} />
                  <Text style={styles.categoryBadgeText}>{selectedMarkerStyle.label}</Text>
                </View>
                <Text style={styles.reportTitle}>{selectedReport.title?.trim() || 'Sin título'}</Text>
              </View>
              <Pressable onPress={closeReportModal} style={styles.closeButton} hitSlop={10}>
                <XIcon color='#A7B8CF' size={20} />
              </Pressable>
            </View>

            <View style={styles.reportMetadata}>
              <View style={styles.metadataItem}>
                <Calendar size={14} color='#8FA7BD' />
                <Text style={styles.metadataText}>{formatReportDate(selectedReport.$createdAt)}</Text>
              </View>
              <Text style={styles.metadataSeparator}>·</Text>
              {selectedStatusStyle ? (
                <>
                  <View style={styles.metadataItem}>
                    <selectedStatusStyle.Icon size={14} color={selectedStatusStyle.color} />
                    <Text style={[styles.metadataText, styles.statusMetadataText, { color: selectedStatusStyle.color }]}> 
                      {selectedStatusStyle.label}
                    </Text>
                  </View>
                  <Text style={styles.metadataSeparator}>·</Text>
                </>
              ) : null}
              <View style={styles.metadataItem}>
                <MapPin size={14} color='#8FA7BD' />
                <Text style={styles.metadataText}>{selectedReportDistance}</Text>
              </View>
            </View>

            {selectedReportImages.length > 0 ? (
              <View style={styles.mainImageSection}>
                <View style={styles.mainImageContainer}>
                  <Pressable onPress={() => openGalleryAtIndex(0)}>
                    <Image
                      source={{ uri: selectedReportImages[0] }}
                      style={styles.mainImage}
                    />
                  </Pressable>
                  {selectedReportImages.length > 0 && (
                    <View style={styles.photoCountBadge}>
                      <ImageIcon size={14} color='#D5E4FB' strokeWidth={2.2} />
                      <Text style={styles.photoCountText}>
                        {selectedReportImages.length} {selectedReportImages.length === 1 ? 'imagen' : 'imagenes'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Descripción del reporte</Text>
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>
                  {selectedReport.description?.trim() || 'Sin descripcion'}
                </Text>
              </View>
            </View>

            <Text style={styles.reportIdFooter}>{selectedReport.$id}</Text>
          </BottomSheetScrollView>
        ) : null}
      </BottomSheetModal>

      <Modal
        visible={isGalleryVisible}
        transparent
        animationType='fade'
        onRequestClose={closeGallery}
        statusBarTranslucent
      >
        <View style={styles.galleryOverlay}>
          <View style={styles.galleryHeader}>
            <View style={styles.galleryCounterChip}>
              <ImageIcon size={14} color='#D5E4FB' strokeWidth={2.2} />
              <Text style={styles.galleryCounterText}>
                {selectedImageIndex + 1}/{Math.max(1, selectedReportImages.length)}
              </Text>
            </View>
            <Pressable onPress={closeGallery} style={styles.galleryCloseButton} hitSlop={10}>
              <XIcon color='#D5E4FB' size={21} />
            </Pressable>
          </View>

          <FlatList
            ref={galleryListRef}
            data={selectedReportImages}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={2}
            getItemLayout={(_, index) => ({
              length: galleryWidth,
              offset: galleryWidth * index,
              index,
            })}
            onScrollToIndexFailed={() => {
              galleryListRef.current?.scrollToOffset({
                offset: selectedImageIndex * galleryWidth,
                animated: false,
              });
            }}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const nextIndex = Math.round(offsetX / Math.max(1, galleryWidth));
              setSelectedImageIndex(Math.max(0, Math.min(nextIndex, selectedReportImages.length - 1)));
            }}
            renderItem={({ item }) => (
              <View style={[styles.gallerySlide, { width: galleryWidth }]}> 
                <Image
                  source={{ uri: item }}
                  style={[styles.galleryImage, { maxHeight: galleryHeight * 0.78 }]}
                  resizeMode='contain'
                />
              </View>
            )}
          />
        </View>
      </Modal>

      {showIntroLogo ? (
        <View pointerEvents='none' style={styles.introOverlay}>
          <Animated.Image
            source={require('@/assets/faro_full_nobg.png')}
            style={[styles.introLogo, { opacity: introLogoOpacity }]}
            resizeMode='contain'
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 10, 18, 0.32)',
  },
  introLogo: {
    width: INTRO_LOGO_SIZE,
    height: INTRO_LOGO_SIZE,
  },
  markerContainer: {
    alignItems: 'center',
    width: 108,
    minHeight: 78,
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  markerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(8, 26, 42, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  markerLabelPill: {
    marginTop: 6,
    backgroundColor: '#2E3A5D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(149, 174, 220, 0.2)',
    maxWidth: 104,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  markerTip: {
    width: 0,
    height: 0,
    marginTop: 3,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2E3A5D',
  },
  markerLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DCE8FF',
    letterSpacing: 0.4,
  },
  bottomSheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(190, 209, 235, 0.5)',
  },
  bottomSheetBackground: {
    backgroundColor: '#081525',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(151, 182, 222, 0.2)',
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTitleSection: {
    flex: 1,
    gap: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#06121E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  reportTitle: {
    color: '#E4EEFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    color: '#8FA7BD',
    fontSize: 13,
    fontWeight: '500',
  },
  statusMetadataText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metadataSeparator: {
    color: '#566E86',
    marginHorizontal: 6,
    fontSize: 12,
  },
  mainImageSection: {
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  mainImageContainer: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#1A2F50',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(8, 21, 37, 0.62)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(200, 216, 242, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoCountText: {
    color: '#D5E4FB',
    fontSize: 11,
    fontWeight: '700',
  },
  galleryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 8, 14, 0.97)',
    justifyContent: 'center',
  },
  galleryHeader: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryCounterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(200, 216, 242, 0.28)',
    backgroundColor: 'rgba(8, 21, 37, 0.62)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  galleryCounterText: {
    color: '#D5E4FB',
    fontSize: 13,
    fontWeight: '700',
  },
  galleryCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(200, 216, 242, 0.28)',
    backgroundColor: 'rgba(8, 21, 37, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallerySlide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  descriptionSection: {
    marginTop: 10,
    gap: 12,
  },
  descriptionTitle: {
    color: '#25C7FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  descriptionContainer: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(125, 160, 195, 0.5)',
    backgroundColor: 'rgba(14, 34, 70, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descriptionText: {
    color: '#D7E5FB',
    fontSize: 15,
    lineHeight: 22,
  },
  reportIdFooter: {
    color: '#576A82',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
});