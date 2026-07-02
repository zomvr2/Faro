import { Layer, LayerAnnotation } from "@maplibre/maplibre-react-native";

type UserLocationPuckLayerProps = {
  coordinate: GeoJSON.Position;
};

const USER_LOCATION_SOURCE_ID = "faro-user-location";

const ACCURACY_HALO_PAINT = {
  "circle-radius": 18,
  "circle-color": "#1A73E8",
  "circle-opacity": 0.16,
  "circle-pitch-alignment": "viewport",
  "circle-pitch-scale": "viewport",
} as const;

const OUTER_DOT_PAINT = {
  "circle-radius": 10,
  "circle-color": "#FFFFFF",
  "circle-pitch-alignment": "viewport",
  "circle-pitch-scale": "viewport",
  "circle-stroke-width": 1,
  "circle-stroke-color": "rgba(0, 0, 0, 0.18)",
} as const;

const INNER_DOT_PAINT = {
  "circle-radius": 7,
  "circle-color": "#1A73E8",
  "circle-pitch-alignment": "viewport",
  "circle-pitch-scale": "viewport",
} as const;

export function UserLocationPuckLayer({ coordinate }: UserLocationPuckLayerProps) {
  const lngLat: [number, number] = [coordinate[0], coordinate[1]];

  return (
    <LayerAnnotation animated id={USER_LOCATION_SOURCE_ID} lngLat={lngLat}>
      <Layer
        id="faro-user-location-halo"
        type="circle"
        paint={ACCURACY_HALO_PAINT}
      />
      <Layer
        id="faro-user-location-outer"
        type="circle"
        paint={OUTER_DOT_PAINT}
      />
      <Layer
        id="faro-user-location-inner"
        type="circle"
        paint={INNER_DOT_PAINT}
      />
    </LayerAnnotation>
  );
}
