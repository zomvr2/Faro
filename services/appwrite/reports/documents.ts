import { ID, Query } from "react-native-appwrite";

import { getAppwriteDatabases } from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";
import { normalizeImagesField } from "@/services/appwrite/reports/serializers";
import type {
  ReportCategory,
  ReportData,
  ReportDocument,
  ReportStatus,
} from "@/services/appwrite/reports/types";

export async function createReportDocument(data: ReportData): Promise<ReportDocument> {
  const env = getAppwriteEnv();
  const locationLabel = data.locationLabel?.trim();
  const documentData: {
    title: string;
    category: ReportCategory;
    description: string;
    lng: number;
    lat: number;
    status: ReportStatus;
    images: string;
    rating: number;
    locationLabel?: string;
  } = {
    title: data.title,
    category: data.category,
    description: data.description,
    lng: data.lng,
    lat: data.lat,
    status: data.status ?? "active",
    images: normalizeImagesField(data),
    rating: 0,
  };

  if (locationLabel) {
    documentData.locationLabel = locationLabel;
  }

  return getAppwriteDatabases().createDocument<ReportDocument>(
    env.databaseId,
    env.reportsCollectionId,
    ID.unique(),
    documentData
  );
}

export async function listLatestReports(limit = 25): Promise<ReportDocument[]> {
  const env = getAppwriteEnv();
  const response = await getAppwriteDatabases().listDocuments<ReportDocument>(
    env.databaseId,
    env.reportsCollectionId,
    [Query.orderDesc("$createdAt"), Query.limit(limit)]
  );

  return response.documents;
}
