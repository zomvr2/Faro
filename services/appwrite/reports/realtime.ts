import type { RealtimeResponseEvent } from "react-native-appwrite";

import { getAppwriteClient } from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";
import type { ReportDocument } from "@/services/appwrite/reports/types";

function getRealtimeChannel() {
  const env = getAppwriteEnv();
  return `databases.${env.databaseId}.collections.${env.reportsCollectionId}.documents`;
}

export function subscribeToReports(
  onEvent: (event: RealtimeResponseEvent<ReportDocument>) => void
): () => void {
  return getAppwriteClient().subscribe<ReportDocument>(getRealtimeChannel(), onEvent);
}
