import { Camera, MapView, UserLocation, UserTrackingMode, type CameraRef, type Location as MapLocation } from '@maplibre/maplibre-react-native';
import * as ExpoLocation from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useMapCameraControls } from './MapCameraContext';

const OVERVIEW_COORDINATE: GeoJSON.Position = [-71.29, -29.95];
const OVERVIEW_ZOOM_LEVEL = 10;
const USER_ZOOM_LEVEL = 16;
const USER_PITCH = 45;
const INTRO_DELAY_MS = 2000;
const INTRO_FLY_DURATION_MS = 3500;
const RECENTER_FLY_DURATION_MS = 900;

export default function Map() {
  const cameraRef = useRef<CameraRef>(null);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestUserCoordinateRef = useRef<GeoJSON.Position | null>(null);
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const { registerCenterOnUser, setIsCenteredOnUser } = useMapCameraControls();

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Enable location permissions to use live tracking and heading.'
        );
      }
    };

    requestPermissions();
  }, []);

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

  const handleUserLocationUpdate = useCallback((location: MapLocation) => {
    if (introStarted) {
      latestUserCoordinateRef.current = [location.coords.longitude, location.coords.latitude];
      return;
    }

    const { latitude, longitude } = location.coords;
    latestUserCoordinateRef.current = [longitude, latitude];

    setIntroStarted(true);

    queueIntroTimer(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        animationMode: 'flyTo',
        animationDuration: INTRO_FLY_DURATION_MS,
      });

      queueIntroTimer(() => {
        setFollowUserLocation(true);
        setIsCenteredOnUser(true);
      }, INTRO_FLY_DURATION_MS);
    }, INTRO_DELAY_MS);
  }, [introStarted, queueIntroTimer, setIsCenteredOnUser]);

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
      registerCenterOnUser(null);
    };
  }, [centerCameraOnUser, registerCenterOnUser]);

  return (
    <MapView
      attributionEnabled={false}
      compassEnabled={false}
      logoEnabled={false}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      onRegionWillChange={handleRegionWillChange}
      style={{ flex: 1 }}
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
  )
}