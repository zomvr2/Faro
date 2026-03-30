import { Camera, MapView, UserLocation, UserTrackingMode } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import React, { useEffect } from 'react';
import { Alert } from 'react-native';

export default function Map() {
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Enable location permissions to use live tracking and heading.'
        );
      }
    };

    requestPermissions();
  }, []);

  return (
    <MapView
      attributionEnabled={false}
      compassEnabled={false}
      logoEnabled={false}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      style={{ flex: 1 }}
    >
      <Camera
        followUserLocation
        followUserMode={UserTrackingMode.FollowWithCourse}
        animationMode='flyTo'
        followZoomLevel={16}
        followPitch={45}
      />

      <UserLocation
        showsUserHeadingIndicator
        renderMode='native'
        androidRenderMode='compass'
      />
    </MapView>
  )
}