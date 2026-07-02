import type { REPORT_CATEGORIES, REPORT_STATUSES } from "@/shared/reports/constants";

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportRatingVote = "truthful" | "false";
