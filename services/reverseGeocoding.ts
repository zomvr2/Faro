type Coordinates = {
  lat: number;
  lng: number;
};

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  residential?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
};

type NominatimReverseResponse = {
  address?: NominatimAddress;
  name?: string;
  display_name?: string;
};

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const REVERSE_GEOCODE_MIN_INTERVAL_MS = 1100;
const locationLabelCache = new Map<string, Promise<string | null>>();
let lastReverseGeocodeAt = 0;

function getCacheKey({ lat, lng }: Coordinates): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function cleanLocationPart(value?: string | null): string | null {
  const cleanedValue = value?.trim();
  return cleanedValue ? cleanedValue : null;
}

function getRoadName(address?: NominatimAddress): string | null {
  return (
    cleanLocationPart(address?.road) ??
    cleanLocationPart(address?.pedestrian) ??
    cleanLocationPart(address?.footway) ??
    cleanLocationPart(address?.residential)
  );
}

function getAreaName(address?: NominatimAddress): string | null {
  return (
    cleanLocationPart(address?.neighbourhood) ??
    cleanLocationPart(address?.suburb) ??
    cleanLocationPart(address?.city) ??
    cleanLocationPart(address?.town) ??
    cleanLocationPart(address?.village)
  );
}

function buildLocationLabel(response: NominatimReverseResponse): string | null {
  const roadName = getRoadName(response.address);

  if (roadName) {
    return `Cerca de ${roadName}`;
  }

  const areaName = getAreaName(response.address) ?? cleanLocationPart(response.name);

  if (areaName) {
    return `Cerca de ${areaName}`;
  }

  const displayName = cleanLocationPart(response.display_name)?.split(",")[0]?.trim();
  return displayName ? `Cerca de ${displayName}` : null;
}

async function waitForReverseGeocodeSlot(): Promise<void> {
  const now = Date.now();
  const elapsedMs = now - lastReverseGeocodeAt;

  if (elapsedMs < REVERSE_GEOCODE_MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, REVERSE_GEOCODE_MIN_INTERVAL_MS - elapsedMs));
  }

  lastReverseGeocodeAt = Date.now();
}

async function fetchLocationLabel(coordinates: Coordinates): Promise<string | null> {
  await waitForReverseGeocodeSlot();

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(coordinates.lat),
    lon: String(coordinates.lng),
    addressdetails: "1",
    zoom: "18",
  });

  const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "es-CL,es;q=0.9",
      Referer: "FaroApp",
      "User-Agent": "FaroApp/1.0 development",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimReverseResponse;
  return buildLocationLabel(data);
}

export async function getApproximateLocationLabel(coordinates: Coordinates): Promise<string | null> {
  if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    return null;
  }

  const cacheKey = getCacheKey(coordinates);
  const cachedRequest = locationLabelCache.get(cacheKey);

  if (cachedRequest) {
    return cachedRequest;
  }

  const request = fetchLocationLabel(coordinates).catch(() => null);
  locationLabelCache.set(cacheKey, request);
  return request;
}
