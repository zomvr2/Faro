import { getAppwriteDatabases } from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";
import { normalizeReportRating } from "@/services/appwrite/reports/serializers";
import type {
  ReportDocument,
  ReportRatingVote,
} from "@/services/appwrite/reports/types";

export async function voteReportRating(
  reportId: string,
  vote: ReportRatingVote
): Promise<ReportDocument> {
  const env = getAppwriteEnv();
  const databases = getAppwriteDatabases();
  const voteDelta = vote === "truthful" ? 1 : -1;

  try {
    if (voteDelta > 0) {
      return await databases.incrementDocumentAttribute<ReportDocument>(
        env.databaseId,
        env.reportsCollectionId,
        reportId,
        "rating",
        1
      );
    }

    return await databases.decrementDocumentAttribute<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      reportId,
      "rating",
      1
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
