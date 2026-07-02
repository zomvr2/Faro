import { getAppwriteDatabases } from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";
import {
  getReportRatingVoteDelta,
  getStoredReportRatingVote,
  setStoredReportRatingVote,
} from "@/services/appwrite/reports/deviceRatingVotes";
import { normalizeReportRating } from "@/services/appwrite/reports/serializers";
import type {
  ReportDocument,
  ReportRatingVote,
} from "@/services/appwrite/reports/types";

async function updateReportRatingByDelta(
  reportId: string,
  voteDelta: number
): Promise<ReportDocument> {
  const env = getAppwriteEnv();
  const databases = getAppwriteDatabases();

  try {
    if (voteDelta > 0) {
      return await databases.incrementDocumentAttribute<ReportDocument>(
        env.databaseId,
        env.reportsCollectionId,
        reportId,
        "rating",
        voteDelta
      );
    }

    return await databases.decrementDocumentAttribute<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      reportId,
      "rating",
      Math.abs(voteDelta)
    );
  } catch {
    const report = await databases.getDocument<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      reportId
    );

    return databases.updateDocument<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      reportId,
      {
        rating: normalizeReportRating(report.rating) + voteDelta,
      }
    );
  }
}

export async function voteReportRating(
  reportId: string,
  vote: ReportRatingVote
): Promise<ReportDocument> {
  const env = getAppwriteEnv();
  const databases = getAppwriteDatabases();
  const previousVote = await getStoredReportRatingVote(reportId);
  const voteDelta = getReportRatingVoteDelta(previousVote, vote);

  if (voteDelta === 0) {
    return databases.getDocument<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      reportId
    );
  }

  await setStoredReportRatingVote(reportId, vote);

  try {
    return await updateReportRatingByDelta(reportId, voteDelta);
  } catch (error) {
    await setStoredReportRatingVote(reportId, previousVote);
    throw error;
  }
}
