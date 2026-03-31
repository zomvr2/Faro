import {
    ID,
    Models,
    Query,
    RealtimeResponseEvent,
    type UploadProgress,
} from "react-native-appwrite";

import {
    getAppwriteClient,
    getAppwriteDatabases,
    getAppwriteStorage,
} from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";

export const REPORT_CATEGORIES = [
  "security",
  "traffic",
  "infrastructure",
  "lighting",
  "waste",
  "water",
  "noise",
  "animals",
] as const;

export const REPORT_STATUSES = ["active", "solved", "false"] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportData = {
  title: string;
  category: ReportCategory;
  description: string;
  lng: number;
  lat: number;
  status?: ReportStatus;
  imageUrls?: string[];
  images?: string;
};

export type ReportDocument = Models.Document & {
  title: string;
  description: string;
  category: ReportCategory;
  lng: number;
  lat: number;
  status: ReportStatus;
  images: string;
};

export type UploadMediaInput = {
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  onProgress?: (progress: UploadProgress) => void;
};

const getRealtimeChannel = () => {
  const env = getAppwriteEnv();
  return `databases.${env.databaseId}.collections.${env.reportsCollectionId}.documents`;
};

function normalizeImagesField(data: ReportData): string {
  const rawUrls = data.images
    ? data.images.split(",")
    : data.imageUrls ?? [];

  return rawUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(",");
}

export function getReportImageUrls(report: Pick<ReportDocument, "images">): string[] {
  return report.images
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function uploadReportMedia(input: UploadMediaInput): Promise<Models.File> {
  const env = getAppwriteEnv();
  const fileName = input.fileName ?? `report-${Date.now()}.jpg`;
  const mimeType = input.mimeType ?? "image/jpeg";
  const fileSize = input.fileSize ?? 1;

  return getAppwriteStorage().createFile({
    bucketId: env.reportsBucketId,
    fileId: ID.unique(),
    file: {
      uri: input.uri,
      name: fileName,
      type: mimeType,
      size: fileSize,
    },
    onProgress: input.onProgress,
  });
}

export function getReportMediaPreviewUrl(fileId: string): string {
  const env = getAppwriteEnv();
  return `${env.endpoint}/storage/buckets/${env.reportsBucketId}/files/${fileId}/view?project=${env.projectId}`;
}

export async function createReportDocument(data: ReportData): Promise<ReportDocument> {
  const env = getAppwriteEnv();

  return getAppwriteDatabases().createDocument<ReportDocument>(
    env.databaseId,
    env.reportsCollectionId,
    ID.unique(),
    {
      title: data.title,
      category: data.category,
      description: data.description,
      lng: data.lng,
      lat: data.lat,
      status: data.status ?? "active",
      images: normalizeImagesField(data),
    }
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

export function subscribeToReports(
  onEvent: (event: RealtimeResponseEvent<ReportDocument>) => void
): () => void {
  return getAppwriteClient().subscribe<ReportDocument>(getRealtimeChannel(), onEvent);
}
