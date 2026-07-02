export type Coordinates = {
  lat: number;
  lng: number;
};

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function getDistanceMeters(from: Coordinates, to: Coordinates): number {
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const haversineTerm =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversineTerm), Math.sqrt(1 - haversineTerm));
  return EARTH_RADIUS_METERS * centralAngle;
}

export function getLngLatDistanceMeters(from: readonly number[], to: readonly number[]): number {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;

  return getDistanceMeters(
    {
      lat: fromLat,
      lng: fromLng,
    },
    {
      lat: toLat,
      lng: toLng,
    }
  );
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.max(1, Math.round(distanceMeters))} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}
