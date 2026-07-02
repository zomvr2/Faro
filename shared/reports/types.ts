import type { REPORT_CATEGORIES, REPORT_STATUSES } from "@/shared/reports/constants";

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportRatingVote = "truthful" | "false";
export type ReportStatusVote = ReportStatus;
export type ReportStatusVoteCounts = Record<ReportStatusVote, number>;
export type ReportTimelineKind = ReportStatusVote | "created" | "confirmed" | "reopened";

export type ReportTimelineItem = {
  id: string;
  type: ReportTimelineKind;
  title: string;
  description: string;
  occurredAt: string;
};
