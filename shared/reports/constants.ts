export const REPORT_CATEGORIES = [
  "security",
  "traffic",
  "infrastructure",
  "lighting",
  "waste",
  "fire",
  "noise",
  "accident",
  "event",
] as const;

export const REPORT_STATUSES = ["active", "solved", "false"] as const;
export const REPORT_STATUS_VOTES = REPORT_STATUSES;

export const REPORT_STATUS_TIMELINE_LIMIT = 24;
export const REPORT_SOLVED_STATUS_VOTE_THRESHOLD = 5;

export const DEFAULT_REPORT_LOCATION_LABEL = "Ubicacion aproximada";
export const POSSIBLY_FALSE_RATING_THRESHOLD = -3;
