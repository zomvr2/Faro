import { ID, Query } from "react-native-appwrite";

import { getAppwriteDatabases } from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";
import { normalizeImagesField } from "@/services/appwrite/reports/serializers";
import { getLocalDeviceAccountId } from "@/services/device";
import type {
  ReportCategory,
  ReportData,
  ReportDocument,
  ReportStatus,
  ReportUpdateData,
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
    deviceAccountId?: string;
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
  const deviceAccountId = data.deviceAccountId?.trim() || await getLocalDeviceAccountId();

  if (locationLabel) {
    documentData.locationLabel = locationLabel;
  }

  if (deviceAccountId) {
    documentData.deviceAccountId = deviceAccountId;
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

export async function deleteReportDocument(reportId: string): Promise<void> {
  const env = getAppwriteEnv();

  await getAppwriteDatabases().deleteDocument(
    env.databaseId,
    env.reportsCollectionId,
    reportId
  );
}

export async function updateReportDocument(
  reportId: string,
  data: ReportUpdateData
): Promise<ReportDocument> {
  const env = getAppwriteEnv();
  const updateData: ReportUpdateData = {};

  if (typeof data.title === "string") {
    updateData.title = data.title.trim();
  }

  if (typeof data.description === "string") {
    updateData.description = data.description.trim();
  }

  if (data.category) {
    updateData.category = data.category;
  }

  if (Object.keys(updateData).length === 0) {
    return getAppwriteDatabases().getDocument<ReportDocument>(
      env.databaseId,
      env.reportsCollectionId,
      reportId
    );
  }

  return getAppwriteDatabases().updateDocument<ReportDocument>(
    env.databaseId,
    env.reportsCollectionId,
    reportId,
    updateData
  );
}
