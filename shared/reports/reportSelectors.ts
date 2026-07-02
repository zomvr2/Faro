import {
  DEFAULT_REPORT_LOCATION_LABEL,
  POSSIBLY_FALSE_RATING_THRESHOLD,
  REPORT_SOLVED_STATUS_VOTE_THRESHOLD,
  REPORT_STATUS_TIMELINE_LIMIT,
  REPORT_STATUS_VOTES,
} from "@/shared/reports/constants";
import type {
  ReportStatus,
  ReportStatusVote,
  ReportStatusVoteCounts,
  ReportTimelineItem,
  ReportTimelineKind,
} from "@/shared/reports/types";

type ReportStatusVoteBacked = {
  activeVotes?: number | null;
  solvedVotes?: number | null;
  falseVotes?: number | null;
  status: ReportStatus;
};

type ReportTimelineBacked = ReportStatusVoteBacked & {
  $createdAt: string;
  $id: string;
  $updatedAt: string;
  rating: number | null;
  statusTimeline?: string | null;
};

type StoredTimelineEvent = {
  at?: unknown;
  count?: unknown;
  counts?: unknown;
  id?: unknown;
  status?: unknown;
  type?: unknown;
  vote?: unknown;
};

const EMPTY_STATUS_VOTE_COUNTS: ReportStatusVoteCounts = {
  active: 0,
  solved: 0,
  false: 0,
};

function isReportStatusVote(value: unknown): value is ReportStatusVote {
  return REPORT_STATUS_VOTES.includes(value as ReportStatusVote);
}

function normalizeVoteCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function getNeighborCountLabel(count: number): string {
  return `${count} ${count === 1 ? "vecino" : "vecinos"}`;
}

function getTimelineEventType(event: StoredTimelineEvent): ReportTimelineKind | null {
  if (event.type === "reopened") {
    return "reopened";
  }

  if (isReportStatusVote(event.type)) {
    return event.type;
  }

  if (isReportStatusVote(event.vote)) {
    return event.vote;
  }

  return null;
}

function getTimelineEventCount(event: StoredTimelineEvent, eventType: ReportTimelineKind): number {
  if (typeof event.count === "number" && Number.isFinite(event.count)) {
    return Math.max(1, Math.floor(event.count));
  }

  const voteType = eventType === "reopened" ? "active" : eventType;

  if (isReportStatusVote(voteType) && event.counts && typeof event.counts === "object") {
    const counts = event.counts as Partial<Record<ReportStatusVote, unknown>>;
    return Math.max(1, normalizeVoteCount(counts[voteType]));
  }

  return 1;
}

function getTimelineCopy(type: ReportTimelineKind, count: number): Pick<ReportTimelineItem, "title" | "description"> {
  if (type === "created") {
    return {
      title: "Reporte creado",
      description: "Se publico el incidente en Faro para seguimiento comunitario.",
    };
  }

  if (type === "confirmed") {
    return {
      title: "Confirmado por vecinos",
      description: `${getNeighborCountLabel(count)} marcaron este reporte como veridico.`,
    };
  }

  if (type === "solved") {
    if (count < REPORT_SOLVED_STATUS_VOTE_THRESHOLD) {
      return {
        title: "Voto de resolucion registrado",
        description: "Se registro una senal comunitaria de que el incidente podria estar resuelto.",
      };
    }

    return {
      title: "Resuelto por la comunidad",
      description: "La comunidad confirmo que el incidente fue resuelto.",
    };
  }

  if (type === "false") {
    return {
      title: "Duplicado o falso",
      description: `${getNeighborCountLabel(count)} marcaron el reporte como duplicado o falso.`,
    };
  }

  if (type === "reopened") {
    return {
      title: "Reporte reabierto",
      description: `${getNeighborCountLabel(count)} volvieron a indicar que el incidente sigue activo.`,
    };
  }

  return {
    title: "Sigue activo",
    description: `${getNeighborCountLabel(count)} indicaron que el incidente continua activo.`,
  };
}

function parseStoredTimeline(rawTimeline: string | null | undefined): StoredTimelineEvent[] {
  if (!rawTimeline) {
    return [];
  }

  try {
    const parsedTimeline = JSON.parse(rawTimeline) as unknown;

    if (!Array.isArray(parsedTimeline)) {
      return [];
    }

    return parsedTimeline.filter((event): event is StoredTimelineEvent => (
      Boolean(event) &&
      typeof event === "object" &&
      !Array.isArray(event)
    ));
  } catch {
    return [];
  }
}

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
    return "Confirmado por la comunidad";
  }

  if (status === "false") {
    return "Marcado como falso";
  }

  return "Reporte en revision";
}

export function getReportStatusVoteCounts(report: {
  activeVotes?: number | null;
  solvedVotes?: number | null;
  falseVotes?: number | null;
}): ReportStatusVoteCounts {
  return {
    active: normalizeVoteCount(report.activeVotes),
    solved: normalizeVoteCount(report.solvedVotes),
    false: normalizeVoteCount(report.falseVotes),
  };
}

export function formatCommunityVoteCount(count: number): string {
  return `${count} ${count === 1 ? "voto" : "votos"}`;
}

export function getReportStatusVoteDelta(
  previousVote: ReportStatusVote | null,
  nextVote: ReportStatusVote
): ReportStatusVoteCounts {
  const delta = { ...EMPTY_STATUS_VOTE_COUNTS };

  if (previousVote === nextVote) {
    return delta;
  }

  if (previousVote) {
    delta[previousVote] -= 1;
  }

  delta[nextVote] += 1;
  return delta;
}

export function applyReportStatusVoteDelta(
  counts: ReportStatusVoteCounts,
  delta: ReportStatusVoteCounts
): ReportStatusVoteCounts {
  return {
    active: Math.max(0, counts.active + delta.active),
    solved: Math.max(0, counts.solved + delta.solved),
    false: Math.max(0, counts.false + delta.false),
  };
}

export function resolveReportStatusFromVoteCounts(
  counts: ReportStatusVoteCounts,
  currentStatus: ReportStatus,
  latestVote: ReportStatusVote
): ReportStatus {
  const solvedHasConsensus = counts.solved >= REPORT_SOLVED_STATUS_VOTE_THRESHOLD;
  const eligibleCounts: ReportStatusVoteCounts = {
    active: counts.active,
    solved: solvedHasConsensus ? counts.solved : 0,
    false: counts.false,
  };
  const maxVotes = Math.max(eligibleCounts.active, eligibleCounts.solved, eligibleCounts.false);

  if (maxVotes <= 0) {
    return currentStatus === "solved" && !solvedHasConsensus ? "active" : currentStatus;
  }

  if (latestVote !== "solved" && eligibleCounts[latestVote] === maxVotes) {
    return latestVote;
  }

  if (latestVote === "solved" && solvedHasConsensus && eligibleCounts.solved === maxVotes) {
    return latestVote;
  }

  const dominantVote = REPORT_STATUS_VOTES.find((vote) => eligibleCounts[vote] === maxVotes);
  return dominantVote ?? currentStatus;
}

export function buildReportStatusVoteSnapshot(
  report: ReportStatusVoteBacked,
  previousVote: ReportStatusVote | null,
  nextVote: ReportStatusVote
): { counts: ReportStatusVoteCounts; status: ReportStatus } {
  const currentCounts = getReportStatusVoteCounts(report);
  const voteDelta = getReportStatusVoteDelta(previousVote, nextVote);
  const nextCounts = applyReportStatusVoteDelta(currentCounts, voteDelta);

  return {
    counts: nextCounts,
    status: resolveReportStatusFromVoteCounts(nextCounts, report.status, nextVote),
  };
}

export function getReportTimelineItems(report: ReportTimelineBacked): ReportTimelineItem[] {
  const entries: Array<ReportTimelineItem & { order: number }> = [
    {
      id: `${report.$id}-created`,
      type: "created",
      occurredAt: report.$createdAt,
      order: 0,
      ...getTimelineCopy("created", 1),
    },
  ];
  const rating = getReportRating(report);

  if (rating > 0) {
    entries.push({
      id: `${report.$id}-confirmed`,
      type: "confirmed",
      occurredAt: report.$updatedAt,
      order: 1,
      ...getTimelineCopy("confirmed", rating),
    });
  }

  const storedEvents = parseStoredTimeline(report.statusTimeline).slice(-REPORT_STATUS_TIMELINE_LIMIT);
  const solvedConsensusEventIndex = storedEvents.reduce((latestIndex, event, eventIndex) => {
    const type = getTimelineEventType(event);

    if (type !== "solved") {
      return latestIndex;
    }

    const count = getTimelineEventCount(event, type);
    return count >= REPORT_SOLVED_STATUS_VOTE_THRESHOLD ? eventIndex : latestIndex;
  }, -1);

  storedEvents.forEach((event, eventIndex) => {
    const type = getTimelineEventType(event);
    const occurredAt = typeof event.at === "string" ? event.at : null;

    if (!type || !occurredAt) {
      return;
    }

    const count = getTimelineEventCount(event, type);

    if (type === "solved" && eventIndex !== solvedConsensusEventIndex) {
      return;
    }

    const fallbackId = `${report.$id}-${type}-${occurredAt}-${eventIndex}`;
    entries.push({
      id: typeof event.id === "string" ? event.id : fallbackId,
      type,
      occurredAt,
      order: 2 + eventIndex,
      ...getTimelineCopy(type, count),
    });
  });

  if (storedEvents.length === 0) {
    const counts = getReportStatusVoteCounts(report);

    REPORT_STATUS_VOTES.forEach((vote, voteIndex) => {
      const count = counts[vote];

      if (count <= 0) {
        return;
      }

      if (vote === "solved" && count < REPORT_SOLVED_STATUS_VOTE_THRESHOLD) {
        return;
      }

      entries.push({
        id: `${report.$id}-${vote}-aggregate`,
        type: vote,
        occurredAt: report.$updatedAt,
        order: 10 + voteIndex,
        ...getTimelineCopy(vote, count),
      });
    });
  }

  return entries
    .sort((firstEntry, secondEntry) => {
      const firstTimestamp = Date.parse(firstEntry.occurredAt);
      const secondTimestamp = Date.parse(secondEntry.occurredAt);

      if (Number.isNaN(firstTimestamp) || Number.isNaN(secondTimestamp) || firstTimestamp === secondTimestamp) {
        return firstEntry.order - secondEntry.order;
      }

      return firstTimestamp - secondTimestamp;
    })
    .map(({ order, ...entry }) => entry);
}
