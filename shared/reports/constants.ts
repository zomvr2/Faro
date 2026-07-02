export const REPORT_CATEGORIES = [
  "security",
  "traffic",
  "infrastructure",
  "lighting",
  "waste",
  "fire",
  "noise",
  "accident",
] as const;

export const REPORT_STATUSES = ["active", "solved", "false"] as const;

export const DEFAULT_REPORT_LOCATION_LABEL = "Ubicacion aproximada";
export const POSSIBLY_FALSE_RATING_THRESHOLD = -3;
