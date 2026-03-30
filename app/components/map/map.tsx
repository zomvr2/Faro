import { MapView } from '@maplibre/maplibre-react-native';
import React from 'react';

export default function Map() {
  return (
    <MapView
      attributionEnabled={false}
      compassEnabled={false}
      logoEnabled={false}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
    />
  )
}