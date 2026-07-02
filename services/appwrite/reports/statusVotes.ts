import { getAppwriteDatabases } from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";
import {
  getStoredReportStatusVote,
  setStoredReportStatusVote,
} from "@/services/appwrite/reports/deviceStatusVotes";
import type {
  ReportDocument,
  ReportStatus,
  ReportStatusVote,
} from "@/services/appwrite/reports/types";
import { REPORT_STATUS_TIMELINE_LIMIT } from "@/shared/reports/constants";
import {
  buildReportStatusVoteSnapshot,
  getReportStatusVoteCounts,
} from "@/shared/reports/reportSelectors";
import type {
  ReportStatusVoteCounts,
  ReportTimelineKind,
} from "@/shared/reports/types";

type StoredStatusTimelineEvent = {
  at: string;
  count: number;
  counts: ReportStatusVoteCounts;
  id: string;
  status: ReportStatus;
  type: ReportTimelineKind;
  vote: ReportStatusVote;
};

function parseStatusTimeline(rawTimeline: string | null | undefined): StoredStatusTimelineEvent[] {
  if (!rawTimeline) {
    return [];
  }

  try {
    const parsedTimeline = JSON.parse(rawTimeline) as unknown;

    if (!Array.isArray(parsedTimeline)) {
      return [];
    }

    return parsedTimeline.filter((event): event is StoredStatusTimelineEvent => (
      Boolean(event) &&
      typeof event === "object" &&
      !Array.isArray(event) &&
      typeof (event as StoredStatusTimelineEvent).at === "string" &&
      typeof (event as StoredStatusTimelineEvent).id === "string"
    ));
  } catch {
    return [];
  }
}

function getTimelineEventType(
  previousStatus: ReportStatus,
  nextStatus: ReportStatus,
  vote: ReportStatusVote
): ReportTimelineKind {
  if (vote === "active" && previousStatus !== "active" && nextStatus === "active") {
    return "reopened";
  }

  return vote;
}

function serializeNextStatusTimeline(
  report: ReportDocument,
  vote: ReportStatusVote,
  nextStatus: ReportStatus,
  counts: ReportStatusVoteCounts,
  occurredAt: string
): string {
  const eventType = getTimelineEventType(report.status, nextStatus, vote);
  const eventVote = eventType === "reopened" ? "active" : vote;
  const nextEvent: StoredStatusTimelineEvent = {
    id: `${report.$id}-${occurredAt}-${eventType}`,
    type: eventType,
    vote: eventVote,
    status: nextStatus,
    count: counts[eventVote],
    counts,
    at: occurredAt,
  };

  return JSON.stringify([
    ...parseStatusTimeline(report.statusTimeline),
    nextEvent,
  ].slice(-REPORT_STATUS_TIMELINE_LIMIT));
}

async function updateReportStatusDocument(
  report: ReportDocument,
  vote: ReportStatusVote,
  previousVote: ReportStatusVote | null
): Promise<ReportDocument> {
  const env = getAppwriteEnv();
  const databases = getAppwriteDatabases();
  const nextSnapshot = buildReportStatusVoteSnapshot(report, previousVote, vote);
  const occurredAt = new Date().toISOString();
  const statusTimeline = serializeNextStatusTimeline(
    report,
    vote,
    nextSnapshot.status,
    nextSnapshot.counts,
    occurredAt
  );
  const updateData = {
    status: nextSnapshot.status,
    activeVotes: nextSnapshot.counts.active,
    solvedVotes: nextSnapshot.counts.solved,
    falseVotes: nextSnapshot.counts.false,
    statusTimeline,
  };

  try {
    return await databases.updateDocument<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      report.$id,
      updateData
    );
  } catch (error) {
    try {
      return await databases.updateDocument<ReportDocument>(
        env.databaseId,
        env.reportsCollectionId,
        report.$id,
        { status: nextSnapshot.status }
      );
    } catch {
      throw error;
    }
  }
}

export async function voteReportStatus(
  reportId: string,
  vote: ReportStatusVote
): Promise<ReportDocument> {
  const env = getAppwriteEnv();
  const databases = getAppwriteDatabases();
  const previousVote = await getStoredReportStatusVote(reportId);

  if (previousVote === vote) {
    return databases.getDocument<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      reportId
    );
  }

  const report = await databases.getDocument<ReportDocument>(
    env.databaseId,
    env.reportsCollectionId,
    reportId
  );

  await setStoredReportStatusVote(reportId, vote);

  try {
    return await updateReportStatusDocument(report, vote, previousVote);
  } catch (error) {
    await setStoredReportStatusVote(reportId, previousVote);
    throw error;
  }
}

export function getOptimisticReportStatusVoteUpdate(
  report: ReportDocument,
  previousVote: ReportStatusVote | null,
  vote: ReportStatusVote
): Pick<ReportDocument, "activeVotes" | "solvedVotes" | "falseVotes" | "status"> {
  const nextSnapshot = buildReportStatusVoteSnapshot(report, previousVote, vote);
  const currentCounts = getReportStatusVoteCounts(report);

  if (
    currentCounts.active === nextSnapshot.counts.active &&
    currentCounts.solved === nextSnapshot.counts.solved &&
    currentCounts.false === nextSnapshot.counts.false &&
    report.status === nextSnapshot.status
  ) {
    return {
      activeVotes: report.activeVotes,
      solvedVotes: report.solvedVotes,
      falseVotes: report.falseVotes,
      status: report.status,
    };
  }

  return {
    activeVotes: nextSnapshot.counts.active,
    solvedVotes: nextSnapshot.counts.solved,
    falseVotes: nextSnapshot.counts.false,
    status: nextSnapshot.status,
  };
}
