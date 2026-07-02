export type ServiceAreaBounds = [west: number, south: number, east: number, north: number];

export const SERVICE_AREA_NAME = "La Serena y Coquimbo";

export const SERVICE_AREA_CENTER: [lng: number, lat: number] = [-71.29, -29.95];

export const SERVICE_AREA_BOUNDS: ServiceAreaBounds = [-71.46, -30.1, -71.13, -29.8];

export const MIN_NAVIGATION_ZOOM_LEVEL = 10.7;
export const MAX_NAVIGATION_ZOOM_LEVEL = 19;

export function isLngLatInServiceArea(coordinate: readonly number[]): boolean {
  const [lng, lat] = coordinate;
  const [west, south, east, north] = SERVICE_AREA_BOUNDS;

  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= west &&
    lng <= east &&
    lat >= south &&
    lat <= north
  );
}

export function isCoordinatesInServiceArea(coordinates: { lat: number; lng: number }): boolean {
  return isLngLatInServiceArea([coordinates.lng, coordinates.lat]);
}
