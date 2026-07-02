import {
  type CameraRef,
  type TrackUserLocationChangeEvent,
  type ViewStateChangeEvent,
  useCurrentPosition,
} from "@maplibre/maplibre-react-native";
import * as ExpoLocation from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  type NativeSyntheticEvent,
} from "react-native";

import { useMapCameraControls } from "@/components/map/MapCameraContext";
import {
  INTRO_DELAY_MS,
  INTRO_FLY_DURATION_MS,
  INTRO_MAX_WAIT_MS,
  INITIAL_LOCATION_MAX_AGE_MS,
  INITIAL_LOCATION_REQUIRED_ACCURACY_METERS,
  LOGO_FADE_IN_DURATION_MS,
  LOGO_FADE_OUT_DURATION_MS,
  LOGO_HOLD_DURATION_MS,
  OVERVIEW_ZOOM_LEVEL,
  RECENTER_FLY_DURATION_MS,
  USER_LOCATION_MIN_DISPLACEMENT_METERS,
  USER_PITCH,
  USER_ZOOM_LEVEL,
} from "@/features/map/constants/camera";
import {
  SERVICE_AREA_NAME,
  isLngLatInServiceArea,
} from "@/shared/geo/serviceArea";

export function useMapCameraController() {
  const cameraRef = useRef<CameraRef>(null);
  const introStartedRef = useRef(false);
  const introCoordinateRef = useRef<GeoJSON.Position | null>(null);
  const introLogoFinishedRef = useRef(false);
  const introTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latestUserCoordinateRef = useRef<GeoJSON.Position | null>(null);
  const followUserLocationRef = useRef(false);
  const [introLogoOpacity] = useState(() => new Animated.Value(0));
  const [followUserLocation, setFollowUserLocation] = useState(false);
  const [showIntroLogo, setShowIntroLogo] = useState(false);
  const [userCoordinate, setUserCoordinate] = useState<GeoJSON.Position | null>(null);
  const [currentZoom, setCurrentZoom] = useState(OVERVIEW_ZOOM_LEVEL);
  const currentPosition = useCurrentPosition({
    minDisplacement: USER_LOCATION_MIN_DISPLACEMENT_METERS,
  });
  const {
    registerCenterOnUser,
    setIsCenteredOnUser,
    setIsMapIntroActive,
  } = useMapCameraControls();

  useEffect(() => {
    return () => {
      introTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      introTimersRef.current = [];
    };
  }, []);

  const queueCameraTimer = useCallback((callback: () => void, delayMs: number) => {
    const timerId = setTimeout(callback, delayMs);
    introTimersRef.current.push(timerId);
  }, []);

  const setFollowUserLocationMode = useCallback((shouldFollowUserLocation: boolean) => {
    followUserLocationRef.current = shouldFollowUserLocation;
    setFollowUserLocation(shouldFollowUserLocation);
  }, []);

  const startCameraIntro = useCallback((coordinate: GeoJSON.Position) => {
    setIsMapIntroActive(true);

    queueCameraTimer(() => {
      cameraRef.current?.flyTo({
        center: coordinate as [number, number],
        zoom: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        duration: INTRO_FLY_DURATION_MS,
      });

      queueCameraTimer(() => {
        setFollowUserLocationMode(true);
        setIsCenteredOnUser(true);
        setIsMapIntroActive(false);
      }, INTRO_FLY_DURATION_MS);
    }, INTRO_DELAY_MS);
  }, [queueCameraTimer, setFollowUserLocationMode, setIsCenteredOnUser, setIsMapIntroActive]);

  const maybeStartCameraIntro = useCallback((coordinate: GeoJSON.Position) => {
    if (introStartedRef.current || !introLogoFinishedRef.current) {
      return;
    }

    introStartedRef.current = true;
    startCameraIntro(coordinate);
  }, [startCameraIntro]);

  useEffect(() => {
    setIsMapIntroActive(true);
    setShowIntroLogo(true);
    introLogoFinishedRef.current = false;
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

      introLogoFinishedRef.current = true;
      setShowIntroLogo(false);

      const coordinate = introCoordinateRef.current;

      if (coordinate) {
        maybeStartCameraIntro(coordinate);
      }
    });

    queueCameraTimer(() => {
      if (!introStartedRef.current && !introCoordinateRef.current) {
        setShowIntroLogo(false);
        setIsMapIntroActive(false);
      }
    }, INTRO_MAX_WAIT_MS);

    return () => {
      introLogoOpacity.stopAnimation();
    };
  }, [introLogoOpacity, maybeStartCameraIntro, queueCameraTimer, setIsMapIntroActive]);

  const handleUserCoordinateUpdate = useCallback((liveUserCoordinate: GeoJSON.Position) => {
    latestUserCoordinateRef.current = liveUserCoordinate;
    setUserCoordinate(liveUserCoordinate);

    if (!isLngLatInServiceArea(liveUserCoordinate)) {
      introCoordinateRef.current = null;

      if (!introStartedRef.current && !introCoordinateRef.current) {
        setShowIntroLogo(false);
        setIsMapIntroActive(false);
      }

      return;
    }

    introCoordinateRef.current = liveUserCoordinate;
    maybeStartCameraIntro(liveUserCoordinate);
  }, [maybeStartCameraIntro, setIsMapIntroActive]);

  useEffect(() => {
    let isMounted = true;

    const requestInitialLocation = async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (status !== "granted") {
          setShowIntroLogo(false);
          setIsMapIntroActive(false);
          Alert.alert(
            "Permiso de ubicacion requerido",
            "Activa el permiso de ubicacion para usar el seguimiento en vivo."
          );
          return;
        }

        const lastKnownLocation = await ExpoLocation.getLastKnownPositionAsync({
          maxAge: INITIAL_LOCATION_MAX_AGE_MS,
          requiredAccuracy: INITIAL_LOCATION_REQUIRED_ACCURACY_METERS,
        });

        if (isMounted && lastKnownLocation) {
          const lastKnownCoordinate: GeoJSON.Position = [
            lastKnownLocation.coords.longitude,
            lastKnownLocation.coords.latitude,
          ];

          if (isLngLatInServiceArea(lastKnownCoordinate)) {
            handleUserCoordinateUpdate(lastKnownCoordinate);
          }
        }

        const location = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });

        if (!isMounted) {
          return;
        }

        handleUserCoordinateUpdate([location.coords.longitude, location.coords.latitude]);
      } catch {
        if (isMounted && !introStartedRef.current && !introCoordinateRef.current) {
          setShowIntroLogo(false);
          setIsMapIntroActive(false);
        }
      }
    };

    void requestInitialLocation();

    return () => {
      isMounted = false;
    };
  }, [handleUserCoordinateUpdate, setIsMapIntroActive]);

  useEffect(() => {
    if (!currentPosition) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      handleUserCoordinateUpdate([currentPosition.coords.longitude, currentPosition.coords.latitude]);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [currentPosition, handleUserCoordinateUpdate]);

  const handleRegionWillChange = useCallback((event: { nativeEvent?: { userInteraction?: boolean } }) => {
    const isUserInteraction = event.nativeEvent?.userInteraction === true;

    if (!isUserInteraction) {
      return;
    }

    setFollowUserLocationMode(false);
    setIsCenteredOnUser(false);
  }, [setFollowUserLocationMode, setIsCenteredOnUser]);

  const handleRegionDidChange = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const nextZoom = event.nativeEvent.zoom;

    if (Number.isFinite(nextZoom)) {
      setCurrentZoom(nextZoom);
    }
  }, []);

  const handleTrackUserLocationChange = useCallback((event: NativeSyntheticEvent<TrackUserLocationChangeEvent>) => {
    const trackingMode = event.nativeEvent.trackUserLocation;
    const isTrackingUser =
      trackingMode === "default" ||
      trackingMode === "heading" ||
      trackingMode === "course";

    if (isTrackingUser && !followUserLocationRef.current) {
      return;
    }

    setFollowUserLocationMode(isTrackingUser);
    setIsCenteredOnUser(isTrackingUser);
  }, [setFollowUserLocationMode, setIsCenteredOnUser]);

  const flyToCoordinate = useCallback((
    coordinate: GeoJSON.Position,
    options: {
      duration?: number;
      pitch?: number;
      zoom?: number;
    } = {}
  ) => {
    setFollowUserLocationMode(false);
    setIsCenteredOnUser(false);

    cameraRef.current?.flyTo({
      center: coordinate as [number, number],
      zoom: options.zoom ?? USER_ZOOM_LEVEL,
      pitch: options.pitch ?? USER_PITCH,
      duration: options.duration ?? RECENTER_FLY_DURATION_MS,
    });
  }, [setFollowUserLocationMode, setIsCenteredOnUser]);

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
        Alert.alert("Unable to center map", "Could not get your current location.");
        return;
      }
    }

    if (!isLngLatInServiceArea(coordinate)) {
      setFollowUserLocationMode(false);
      setIsCenteredOnUser(false);
      Alert.alert(
        "Fuera del area de cobertura",
        `Faro solo permite navegar por ${SERVICE_AREA_NAME}.`
      );
      return;
    }

    setFollowUserLocationMode(false);

    requestAnimationFrame(() => {
      cameraRef.current?.flyTo({
        center: coordinate as [number, number],
        zoom: USER_ZOOM_LEVEL,
        pitch: USER_PITCH,
        duration: RECENTER_FLY_DURATION_MS,
      });

      queueCameraTimer(() => {
        setFollowUserLocationMode(true);
        setIsCenteredOnUser(true);
      }, RECENTER_FLY_DURATION_MS + 50);
    });
  }, [queueCameraTimer, setFollowUserLocationMode, setIsCenteredOnUser]);

  useEffect(() => {
    registerCenterOnUser(centerCameraOnUser);

    return () => {
      setIsMapIntroActive(false);
      registerCenterOnUser(null);
    };
  }, [centerCameraOnUser, registerCenterOnUser, setIsMapIntroActive]);

  return {
    cameraRef,
    currentZoom,
    flyToCoordinate,
    followUserLocation,
    handleRegionDidChange,
    handleRegionWillChange,
    handleTrackUserLocationChange,
    introLogoOpacity,
    queueCameraTimer,
    setFollowUserLocationMode,
    setIsCenteredOnUser,
    showIntroLogo,
    userCoordinate,
  };
}
