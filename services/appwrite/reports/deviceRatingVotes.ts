import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { ReportRatingVote } from "@/services/appwrite/reports/types";

const STORAGE_KEY = "faro.reportRatingVotes.v1";
const STORAGE_FILE_NAME = "faro-report-rating-votes.json";

type StoredRatingVotes = Record<string, ReportRatingVote>;
type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function isReportRatingVote(value: unknown): value is ReportRatingVote {
  return value === "truthful" || value === "false";
}

function parseStoredRatingVotes(rawValue: string | null): StoredRatingVotes {
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Record<string, unknown>;

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce<StoredRatingVotes>((votes, [reportId, vote]) => {
      if (isReportRatingVote(vote)) {
        votes[reportId] = vote;
      }

      return votes;
    }, {});
  } catch {
    return {};
  }
}

function getWebStorage(): LocalStorageLike | null {
  const globalScope = globalThis as typeof globalThis & {
    localStorage?: LocalStorageLike;
    window?: {
      localStorage?: LocalStorageLike;
    };
  };

  return globalScope.window?.localStorage ?? globalScope.localStorage ?? null;
}

async function readStoredRatingVotes(): Promise<StoredRatingVotes> {
  if (Platform.OS === "web") {
    return parseStoredRatingVotes(getWebStorage()?.getItem(STORAGE_KEY) ?? null);
  }

  const storageFile = new File(Paths.document, STORAGE_FILE_NAME);

  if (!storageFile.exists) {
    return {};
  }

  return parseStoredRatingVotes(await storageFile.text());
}

async function writeStoredRatingVotes(votes: StoredRatingVotes): Promise<void> {
  const serializedVotes = JSON.stringify(votes);

  if (Platform.OS === "web") {
    getWebStorage()?.setItem(STORAGE_KEY, serializedVotes);
    return;
  }

  const storageFile = new File(Paths.document, STORAGE_FILE_NAME);

  if (!storageFile.exists) {
    storageFile.create({ intermediates: true });
  }

  storageFile.write(serializedVotes);
}

function getVoteValue(vote: ReportRatingVote | null): number {
  if (!vote) {
    return 0;
  }

  return vote === "truthful" ? 1 : -1;
}

export function getReportRatingVoteDelta(
  previousVote: ReportRatingVote | null,
  nextVote: ReportRatingVote
): number {
  if (previousVote === nextVote) {
    return 0;
  }

  return getVoteValue(nextVote);
}

export async function getStoredReportRatingVote(reportId: string): Promise<ReportRatingVote | null> {
  const votes = await readStoredRatingVotes();

  return votes[reportId] ?? null;
}

export async function setStoredReportRatingVote(
  reportId: string,
  vote: ReportRatingVote | null
): Promise<void> {
  const votes = await readStoredRatingVotes();

  if (vote) {
    votes[reportId] = vote;
  } else {
    delete votes[reportId];
  }

  await writeStoredRatingVotes(votes);
}
