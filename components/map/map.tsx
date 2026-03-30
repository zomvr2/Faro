import { Camera, MapView, UserLocation, requestAndroidLocationPermissions } from '@maplibre/maplibre-react-native';
import React, { useEffect, useState } from 'react';

export default function Map() {
  const [coordinates, setCoordinates] = useState([-71.296, -29.929]);

  useEffect(() => {
    requestAndroidLocationPermissions();
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
        zoomLevel={10.8}
        centerCoordinate={coordinates}
        followUserLocation
        animationMode='flyTo'
        followZoomLevel={16}
      />

      <UserLocation
        showsUserHeadingIndicator
        renderMode='normal'
      />
    </MapView>
  )
}