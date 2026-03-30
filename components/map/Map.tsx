import { Camera, MapView, UserLocation, UserTrackingMode, type CameraRef, type Location as MapLocation } from '@maplibre/maplibre-react-native';
import * as ExpoLocation from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, View } from 'react-native';
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

export default function Map() {
  const cameraRef = useRef<CameraRef>(null);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestUserCoordinateRef = useRef<GeoJSON.Position | null>(null);
  const introLogoOpacity = useRef(new Animated.Value(0)).current;
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const [showIntroLogo, setShowIntroLogo] = useState(false);
  const { registerCenterOnUser, setIsCenteredOnUser, setIsMapIntroActive } = useMapCameraControls();

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
    const isGestureActive = Boolean(event?.properties?.gestures?.isGestureActive);

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
});