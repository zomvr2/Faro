import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import { REPORT_STATUS_VOTES } from "@/shared/reports/constants";
import type { ReportStatusVote } from "@/services/appwrite/reports/types";

const STORAGE_KEY = "faro.reportStatusVotes.v1";
const STORAGE_FILE_NAME = "faro-report-status-votes.json";

type StoredStatusVotes = Record<string, ReportStatusVote>;
type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function isReportStatusVote(value: unknown): value is ReportStatusVote {
  return REPORT_STATUS_VOTES.includes(value as ReportStatusVote);
}

function parseStoredStatusVotes(rawValue: string | null): StoredStatusVotes {
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Record<string, unknown>;

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.entries(parsedValue).reduce<StoredStatusVotes>((votes, [reportId, vote]) => {
      if (isReportStatusVote(vote)) {
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

async function readStoredStatusVotes(): Promise<StoredStatusVotes> {
  if (Platform.OS === "web") {
    return parseStoredStatusVotes(getWebStorage()?.getItem(STORAGE_KEY) ?? null);
  }

  const storageFile = new File(Paths.document, STORAGE_FILE_NAME);

  if (!storageFile.exists) {
    return {};
  }

  return parseStoredStatusVotes(await storageFile.text());
}

async function writeStoredStatusVotes(votes: StoredStatusVotes): Promise<void> {
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

export async function getStoredReportStatusVote(reportId: string): Promise<ReportStatusVote | null> {
  const votes = await readStoredStatusVotes();

  return votes[reportId] ?? null;
}

export async function setStoredReportStatusVote(
  reportId: string,
  vote: ReportStatusVote | null
): Promise<void> {
  const votes = await readStoredStatusVotes();

  if (vote) {
    votes[reportId] = vote;
  } else {
    delete votes[reportId];
  }

  await writeStoredStatusVotes(votes);
}
