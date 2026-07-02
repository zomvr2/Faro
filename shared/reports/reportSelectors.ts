import {
  DEFAULT_REPORT_LOCATION_LABEL,
  POSSIBLY_FALSE_RATING_THRESHOLD,
} from "@/shared/reports/constants";

export function getReportRating(report: { rating: number | null }): number {
  const rating = report.rating;
  return typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
}

export function getReportLocationLabel(report: { locationLabel?: string | null }): string {
  const locationLabel = report.locationLabel?.trim();
  return locationLabel || DEFAULT_REPORT_LOCATION_LABEL;
}

export function isReportPossiblyFalse(report: { rating: number | null }): boolean {
  return getReportRating(report) <= POSSIBLY_FALSE_RATING_THRESHOLD;
}

export function formatTruthfulnessScore(rating: number): string {
  return rating > 0 ? `+${rating}` : String(rating);
}

export function getTruthfulnessLabel(rating: number): string {
  if (rating <= POSSIBLY_FALSE_RATING_THRESHOLD) {
    return "Posiblemente falso";
  }

  if (rating < 0) {
    return "Veracidad en duda";
  }

  if (rating > 0) {
    return "Veracidad positiva";
  }

  return "Sin votos de veracidad";
}

export function getStatusDetail(status: string): string {
  if (status === "solved") {
    return "Incidente solucionado";
  }

  if (status === "false") {
    return "Marcado como falso";
  }

  return "Reporte en revision";
}
