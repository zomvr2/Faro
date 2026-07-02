import type { ReportDocument } from "@/services/appwrite";
import { SERVICE_AREA_BOUNDS } from "@/shared/geo/serviceArea";

const REPORT_ZONE_COLUMN_COUNT = 4;
const REPORT_ZONE_ROW_COUNT = 3;

export type ReportZoneCounter = {
  id: string;
  coordinate: [number, number];
  count: number;
};

function clampIndex(value: number, maxIndex: number): number {
  return Math.max(0, Math.min(maxIndex, value));
}

export function getReportZoneCounters(zoneReports: ReportDocument[]): ReportZoneCounter[] {
  const [west, south, east, north] = SERVICE_AREA_BOUNDS;
  const lngSpan = east - west;
  const latSpan = north - south;
  const zones = new globalThis.Map<string, {
    count: number;
    lngTotal: number;
    latTotal: number;
  }>();

  zoneReports.forEach((report) => {
    const column = clampIndex(
      Math.floor(((report.lng - west) / lngSpan) * REPORT_ZONE_COLUMN_COUNT),
      REPORT_ZONE_COLUMN_COUNT - 1
    );
    const row = clampIndex(
      Math.floor(((report.lat - south) / latSpan) * REPORT_ZONE_ROW_COUNT),
      REPORT_ZONE_ROW_COUNT - 1
    );
    const zoneId = `${column}-${row}`;
    const currentZone = zones.get(zoneId) ?? {
      count: 0,
      lngTotal: 0,
      latTotal: 0,
    };

    currentZone.count += 1;
    currentZone.lngTotal += report.lng;
    currentZone.latTotal += report.lat;
    zones.set(zoneId, currentZone);
  });

  return Array.from(zones.entries())
    .map(([zoneId, zone]) => ({
      id: `report-zone-${zoneId}`,
      coordinate: [zone.lngTotal / zone.count, zone.latTotal / zone.count] as [number, number],
      count: zone.count,
    }))
    .sort((firstZone, secondZone) => secondZone.count - firstZone.count);
}
