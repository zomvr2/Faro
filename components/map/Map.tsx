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
    Map as MapLibreMap,
    Marker,
    UserLocation,
    type CameraRef,
    type GeolocationPosition,
    type ViewStateChangeEvent,
    useCurrentPosition,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    type NativeSyntheticEvent,
    useWindowDimensions,
    View,
} from 'react-native';
import { useMapCameraControls } from './MapCameraContext';
import {
    MAX_NAVIGATION_ZOOM_LEVEL,
    MIN_NAVIGATION_ZOOM_LEVEL,
    SERVICE_AREA_BOUNDS,
    SERVICE_AREA_CENTER,
    SERVICE_AREA_NAME,
    isCoordinatesInServiceArea,
    isLngLatInServiceArea,
} from './serviceArea';

const OVERVIEW_COORDINATE: GeoJSON.Position = SERVICE_AREA_CENTER;
const OVERVIEW_ZOOM_LEVEL = MIN_NAVIGATION_ZOOM_LEVEL;
const REPORT_MARKERS_MIN_ZOOM_LEVEL = MIN_NAVIGATION_ZOOM_LEVEL + 1;
const REPORT_ZONE_FOCUS_ZOOM_LEVEL = REPORT_MARKERS_MIN_ZOOM_LEVEL + 0.5;
const REPORT_ZONE_COLUMN_COUNT = 4;
const REPORT_ZONE_ROW_COUNT = 3;
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

type ReportZoneCounter = {
  id: string;
  coordinate: [number, number];
  count: number;
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

function formatCoordinatePair(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function getStatusDetail(status: string): string {
  if (status === 'solved') {
    return 'Incidente solucionado';
  }

  if (status === 'false') {
    return 'Marcado como falso';
  }

  return 'Reporte en revision';
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

function clampIndex(value: number, maxIndex: number): number {
  return Math.max(0, Math.min(maxIndex, value));
}

function getReportZoneCounters(zoneReports: ReportDocument[]): ReportZoneCounter[] {
  const [west, south, east, north] = SERVICE_AREA_BOUNDS;
  const lngSpan = east - west;
  const latSpan = north - south;
  const zones = new globalThis.Map<string, {
    count: number;
    lngTotal: number;
    latTotal: number;
  }>();

  zoneReports.forEach((report) => {
    const column = clampIndex(
      Math.floor(((report.lng - west) / lngSpan) * REPORT_ZONE_COLUMN_COUNT),
      REPORT_ZONE_COLUMN_COUNT - 1
    );
    const row = clampIndex(
      Math.floor(((report.lat - south) / latSpan) * REPORT_ZONE_ROW_COUNT),
      REPORT_ZONE_ROW_COUNT - 1
    );
    const zoneId = `${column}-${row}`;
    const currentZone = zones.get(zoneId) ?? {
      count: 0,
      lngTotal: 0,
      latTotal: 0,
    };

    currentZone.count += 1;
    currentZone.lngTotal += report.lng;
    currentZone.latTotal += report.lat;
    zones.set(zoneId, currentZone);
  });

  return Array.from(zones.entries())
    .map(([zoneId, zone]) => ({
      id: `report-zone-${zoneId}`,
      coordinate: [zone.lngTotal / zone.count, zone.latTotal / zone.count] as [number, number],
      count: zone.count,
    }))
    .sort((firstZone, secondZone) => secondZone.count - firstZone.count);
}

export default function Map() {
  const cameraRef = useRef<CameraRef>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const galleryListRef = useRef<FlatList<string>>(null);
  const lastHandledFocusRef = useRef<string | null>(null);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestUserCoordinateRef = useRef<GeoJSON.Position | null>(null);
  const { width: galleryWidth, height: galleryHeight } = useWindowDimensions();
  const [introLogoOpacity] = useState(() => new Animated.Value(0));
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [showIntroLogo, setShowIntroLogo] = useState(false);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userCoordinate, setUserCoordinate] = useState<GeoJSON.Position | null>(null);
  const [currentZoom, setCurrentZoom] = useState(OVERVIEW_ZOOM_LEVEL);
  const currentPosition = useCurrentPosition();
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
      cameraRef.current?.flyTo({
        center: coordinate as [number, number],
        zoom: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        duration: INTRO_FLY_DURATION_MS,
      });

      queueIntroTimer(() => {
        setFollowUserLocation(true);
        setIsCenteredOnUser(true);
        setIsMapIntroActive(false);
      }, INTRO_FLY_DURATION_MS);
    }, INTRO_DELAY_MS);
  }, [queueIntroTimer, setIsCenteredOnUser, setIsMapIntroActive]);

  const handleUserLocationUpdate = useCallback((location: GeolocationPosition) => {
    const liveUserCoordinate: GeoJSON.Position = [location.coords.longitude, location.coords.latitude];

    latestUserCoordinateRef.current = liveUserCoordinate;
    setUserCoordinate(liveUserCoordinate);

    if (introStarted) {
      return;
    }

    if (!isLngLatInServiceArea(liveUserCoordinate)) {
      setIntroStarted(true);
      setIsMapIntroActive(false);
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

  useEffect(() => {
    if (!currentPosition) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      handleUserLocationUpdate(currentPosition);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [currentPosition, handleUserLocationUpdate]);

  const handleRegionWillChange = useCallback((event: { nativeEvent?: { userInteraction?: boolean } }) => {
    // Only disable follow mode for direct user map interactions.
    const isUserInteraction = event.nativeEvent?.userInteraction === true;

    if (!isUserInteraction) {
      return;
    }

    setFollowUserLocation(false);
    setIsCenteredOnUser(false);
  }, [setIsCenteredOnUser]);

  const handleRegionDidChange = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const nextZoom = event.nativeEvent.zoom;

    if (!Number.isFinite(nextZoom)) {
      return;
    }

    setCurrentZoom(nextZoom);
  }, []);

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

    if (!isLngLatInServiceArea(coordinate)) {
      setFollowUserLocation(false);
      setIsCenteredOnUser(false);
      Alert.alert(
        'Fuera del area de cobertura',
        `Faro solo permite navegar por ${SERVICE_AREA_NAME}.`
      );
      return;
    }

    // Force a manual camera move first, then re-enable follow mode.
    setFollowUserLocation(false);

    requestAnimationFrame(() => {
      cameraRef.current?.flyTo({
        center: coordinate as [number, number],
        zoom: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        duration: RECENTER_FLY_DURATION_MS,
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

  const visibleReports = useMemo(() => reports.filter((report) =>
    Number.isFinite(report.lat) &&
    Number.isFinite(report.lng) &&
    isCoordinatesInServiceArea({ lat: report.lat, lng: report.lng })
  ), [reports]);
  const shouldShowReportMarkers = currentZoom >= REPORT_MARKERS_MIN_ZOOM_LEVEL;
  const reportZoneCounters = useMemo(() => getReportZoneCounters(visibleReports), [visibleReports]);

  const bottomSheetSnapPoints = ['80%'];

  const closeReportModal = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const openReportModal = useCallback((report: ReportDocument) => {
    setSelectedReport(report);
    requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });
  }, []);

  const focusReportZone = useCallback((zoneCounter: ReportZoneCounter) => {
    setFollowUserLocation(false);
    setIsCenteredOnUser(false);

    cameraRef.current?.flyTo({
      center: zoneCounter.coordinate,
      zoom: REPORT_ZONE_FOCUS_ZOOM_LEVEL,
      pitch: USER_PITCH,
      duration: RECENTER_FLY_DURATION_MS,
    });
  }, [setIsCenteredOnUser]);

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
      setFollowUserLocation(false);
      setIsCenteredOnUser(false);

      cameraRef.current?.flyTo({
        center: centerCoordinate as [number, number],
        zoom: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        duration: RECENTER_FLY_DURATION_MS,
      });

      if (targetReport) {
        queueIntroTimer(() => {
          openReportModal(targetReport);
        }, RECENTER_FLY_DURATION_MS + 60);
      }

      router.setParams({ focus: undefined, reportId: undefined, lat: undefined, lng: undefined });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
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

  const handleVotePlaceholder = useCallback((vote: 'veridico' | 'falso') => {
    Alert.alert(
      'Votaciones',
      `El voto ${vote} quedara disponible en la proxima implementacion.`
    );
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
      <MapLibreMap
        attribution={false}
        compass={false}
        logo={false}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onRegionDidChange={handleRegionDidChange}
        onRegionWillChange={handleRegionWillChange}
        style={styles.map}
        tintColor="#1eaae1"
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: OVERVIEW_COORDINATE as [number, number],
            zoom: OVERVIEW_ZOOM_LEVEL,
          }}
          maxBounds={SERVICE_AREA_BOUNDS}
          maxZoom={MAX_NAVIGATION_ZOOM_LEVEL}
          minZoom={MIN_NAVIGATION_ZOOM_LEVEL}
          trackUserLocation={followUserLocation ? 'default' : undefined}
        />

        <UserLocation
          heading
        />

        {shouldShowReportMarkers ? visibleReports.map((report) => {
          const markerStyle = CATEGORY_MARKER_STYLES[report.category] ?? {
            label: report.category.toUpperCase(),
            color: '#00B7FF',
            Icon: ShieldIcon,
          };

          return (
            <Marker
              key={report.$id}
              id={report.$id}
              lngLat={[report.lng, report.lat]}
              anchor='bottom'
              onPress={() => openReportModal(report)}
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
            </Marker>
          );
        }) : reportZoneCounters.map((zoneCounter) => (
          <Marker
            key={zoneCounter.id}
            id={zoneCounter.id}
            lngLat={zoneCounter.coordinate}
            anchor='center'
            onPress={() => focusReportZone(zoneCounter)}
          >
            <View
              accessibilityLabel={`${zoneCounter.count} ${zoneCounter.count === 1 ? 'reporte' : 'reportes'} en esta zona. Toca para acercar.`}
              accessibilityRole='button'
              accessible
              collapsable={false}
              style={styles.zoneCounterContainer}
            >
              <View style={styles.zoneCounterBubble}>
                <CircleAlertIcon size={15} color='#06121E' strokeWidth={2.8} />
                <Text numberOfLines={1} style={styles.zoneCounterCount}>
                  {zoneCounter.count}
                </Text>
              </View>

              <View style={styles.zoneCounterLabelPill}>
                <Text numberOfLines={1} style={styles.zoneCounterLabelText}>
                  {zoneCounter.count === 1 ? 'REPORTE' : 'REPORTES'}
                </Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapLibreMap>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={bottomSheetSnapPoints}
        onChange={handleBottomSheetChange}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBottomSheetBackdrop}
        handleIndicatorStyle={styles.bottomSheetHandle}
        backgroundStyle={styles.bottomSheetBackground}
      >
        {selectedReport && selectedMarkerStyle ? (
          <BottomSheetScrollView
            contentContainerStyle={styles.bottomSheetContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.reportHero}>
              {selectedReportImages.length > 0 ? (
                <Pressable onPress={() => openGalleryAtIndex(0)} style={styles.reportHeroMedia}>
                  <Image
                    source={{ uri: selectedReportImages[0] }}
                    style={styles.reportHeroImage}
                    resizeMode='cover'
                  />
                </Pressable>
              ) : (
                <View style={styles.reportHeroFallback}>
                  <selectedMarkerStyle.Icon size={40} color={selectedMarkerStyle.color} strokeWidth={2.2} />
                  <Text style={styles.reportHeroFallbackText}>{selectedMarkerStyle.label}</Text>
                </View>
              )}

              <Pressable onPress={closeReportModal} style={styles.closeButton} hitSlop={10}>
                <XIcon color='#F3F7FF' size={20} />
              </Pressable>

              <View style={styles.heroBadgesRow}>
                <View style={[styles.categoryBadge, { borderColor: `${selectedMarkerStyle.color}80` }]}>
                  <selectedMarkerStyle.Icon size={12} color={selectedMarkerStyle.color} strokeWidth={2.8} />
                  <Text style={[styles.categoryBadgeText, { color: selectedMarkerStyle.color }]}>
                    {selectedMarkerStyle.label}
                  </Text>
                </View>

                {selectedReportImages.length > 0 ? (
                  <View style={styles.photoCountBadge}>
                    <ImageIcon size={14} color='#D5E4FB' strokeWidth={2.2} />
                    <Text style={styles.photoCountText}>
                      {selectedReportImages.length} {selectedReportImages.length === 1 ? 'imagen' : 'imagenes'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.reportSummaryBody}>
              <View style={styles.reportMetadata}>
                <View style={styles.metadataItem}>
                  <MapPin size={14} color='#9AA7B8' />
                  <Text numberOfLines={1} style={styles.metadataText}>
                    {selectedReportDistance} · {formatCoordinatePair(selectedReport.lat, selectedReport.lng)}
                  </Text>
                </View>
              </View>

              <Text style={styles.reportTitle}>{selectedReport.title?.trim() || 'Sin titulo'}</Text>

              <View style={styles.reportMetadata}>
                <View style={styles.metadataItem}>
                  <Calendar size={14} color='#8795A8' />
                  <Text style={styles.metadataText}>Reportado {formatReportDate(selectedReport.$createdAt).toLowerCase()}</Text>
                </View>
              </View>

              {selectedStatusStyle ? (
                <View
                  style={[
                    styles.statusBanner,
                    {
                      backgroundColor: `${selectedStatusStyle.color}24`,
                      borderColor: `${selectedStatusStyle.color}80`,
                    },
                  ]}
                >
                  <selectedStatusStyle.Icon size={18} color={selectedStatusStyle.color} strokeWidth={2.8} />
                  <Text style={styles.statusBannerText} numberOfLines={1}>
                    <Text style={{ color: '#F3F8FF', fontWeight: '900' }}>{selectedStatusStyle.label}</Text>
                    {' · '}
                    {getStatusDetail(selectedReport.status)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.voteActions}>
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel='Marcar reporte como veridico'
                  onPress={() => handleVotePlaceholder('veridico')}
                  style={({ pressed }) => [
                    styles.voteButton,
                    styles.truthVoteButton,
                    pressed && styles.voteButtonPressed,
                  ]}
                >
                  <CheckIcon size={16} color='#167A3E' strokeWidth={3} />
                  <Text style={[styles.voteButtonText, styles.truthVoteButtonText]}>Veridico</Text>
                </Pressable>

                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel='Marcar reporte como falso'
                  onPress={() => handleVotePlaceholder('falso')}
                  style={({ pressed }) => [
                    styles.voteButton,
                    styles.falseVoteButton,
                    pressed && styles.voteButtonPressed,
                  ]}
                >
                  <XIcon size={16} color='#FF8B8B' strokeWidth={3} />
                  <Text style={styles.voteButtonText}>Falso</Text>
                </Pressable>
              </View>

              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionTitle}>Resumen</Text>
                <Text style={styles.descriptionText}>
                  {selectedReport.description?.trim() || 'Sin descripcion'}
                </Text>
              </View>
            </View>

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
    ...StyleSheet.absoluteFill,
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
  zoneCounterContainer: {
    alignItems: 'center',
    width: 86,
    minHeight: 72,
    justifyContent: 'center',
  },
  zoneCounterBubble: {
    minWidth: 54,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 12,
    backgroundColor: '#F5C648',
    borderWidth: 2,
    borderColor: 'rgba(8, 26, 42, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  zoneCounterCount: {
    color: '#06121E',
    fontSize: 16,
    fontWeight: '900',
  },
  zoneCounterLabelPill: {
    marginTop: 5,
    backgroundColor: '#151515',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245, 198, 72, 0.34)',
  },
  zoneCounterLabelText: {
    color: '#F4E6A5',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bottomSheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 248, 255, 0.34)',
  },
  bottomSheetBackground: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: '#202020',
    overflow: 'hidden',
    position: 'relative',
  },
  reportHeroMedia: {
    flex: 1,
  },
  reportHeroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#202020',
  },
  reportHeroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D1D1D',
    gap: 8,
  },
  reportHeroFallbackText: {
    color: '#EDEDED',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroBadgesRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reportSummaryBody: {
    paddingTop: 14,
    gap: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(18, 18, 18, 0.76)',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  reportTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(17, 17, 17, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    gap: 6,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metadataText: {
    color: '#9C9C9C',
    fontSize: 13,
    fontWeight: '600',
  },
  photoCountBadge: {
    backgroundColor: 'rgba(18, 18, 18, 0.76)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoCountText: {
    color: '#EDEDED',
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
  statusBanner: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBannerText: {
    flex: 1,
    color: '#E5E5E5',
    fontSize: 14,
    fontWeight: '700',
  },
  voteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
  },
  truthVoteButton: {
    backgroundColor: '#F4F4F4',
    borderColor: 'rgba(255, 255, 255, 0.72)',
  },
  falseVoteButton: {
    backgroundColor: '#2E2E2E',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  voteButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  voteButtonText: {
    color: '#F7F7F7',
    fontSize: 14,
    fontWeight: '900',
  },
  truthVoteButtonText: {
    color: '#111111',
  },
  descriptionSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  descriptionTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },
  descriptionText: {
    color: '#CFCFCF',
    fontSize: 16,
    lineHeight: 23,
  },
});
