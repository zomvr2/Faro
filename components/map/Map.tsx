import { listLatestReports, subscribeToReports, type ReportCategory, type ReportDocument } from '@/services/appwrite';
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
import {
  CircleAlertIcon,
  DropletsIcon,
  LightbulbIcon,
  PawPrintIcon,
  ShieldIcon,
  TrafficConeIcon,
  Trash2Icon,
  UsersIcon,
  Volume2Icon,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, View } from 'react-native';
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

const CATEGORY_MARKER_STYLES: Record<
  ReportCategory,
  { label: string; color: string; Icon: LucideIcon }
> = {
  security: { label: 'ACTIVIDAD VECINAL', color: '#00B7FF', Icon: UsersIcon },
  traffic: { label: 'INCIDENTE VIAL', color: '#C91F32', Icon: CircleAlertIcon },
  infrastructure: { label: 'OBRAS EN VIA', color: '#E2A712', Icon: TrafficConeIcon },
  lighting: { label: 'ALUMBRADO', color: '#F5C648', Icon: LightbulbIcon },
  waste: { label: 'BASURA', color: '#4EBB68', Icon: Trash2Icon },
  water: { label: 'AGUA', color: '#25A3FF', Icon: DropletsIcon },
  noise: { label: 'RUIDOS', color: '#8D6ADE', Icon: Volume2Icon },
  animals: { label: 'MASCOTAS', color: '#FF9A3C', Icon: PawPrintIcon },
};

export default function Map() {
  const cameraRef = useRef<CameraRef>(null);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestUserCoordinateRef = useRef<GeoJSON.Position | null>(null);
  const introLogoOpacity = useRef(new Animated.Value(0)).current;
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [showIntroLogo, setShowIntroLogo] = useState(false);
  const [reports, setReports] = useState<ReportDocument[]>([]);
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
    if (introStarted) {
      latestUserCoordinateRef.current = [location.coords.longitude, location.coords.latitude];
      return;
    }

    const { latitude, longitude } = location.coords;
    const coordinate: GeoJSON.Position = [longitude, latitude];
    latestUserCoordinateRef.current = coordinate;

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
      startCameraIntro(coordinate);
    });
  }, [introLogoOpacity, introStarted, setIsMapIntroActive, startCameraIntro]);

  const handleRegionWillChange = useCallback((event: any) => {
    const isGestureActive = Boolean(
      event?.properties?.isUserInteraction ?? event?.properties?.gestures?.isGestureActive
    );

    if (!isGestureActive) {
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
          followUserMode={UserTrackingMode.FollowWithCourse}
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
            >
              <View style={styles.markerContainer}>
                <View style={[styles.markerIconCircle, { backgroundColor: markerStyle.color }]}> 
                  <markerStyle.Icon size={18} color='#06121E' strokeWidth={2.6} />
                </View>

                <View style={styles.markerLabelPill}>
                  <markerStyle.Icon size={12} color='#DCE8FF' strokeWidth={2.6} />
                  <Text numberOfLines={1} style={styles.markerLabelText}>
                    {markerStyle.label}
                  </Text>
                </View>
              </View>
            </MarkerView>
          );
        })}
      </MapView>

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
    width: 130,
    paddingBottom: 4,
  },
  markerIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    marginTop: 8,
    backgroundColor: '#2E3A5D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(149, 174, 220, 0.2)',
    maxWidth: 126,
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
  markerLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DCE8FF',
    letterSpacing: 0.6,
  },
});