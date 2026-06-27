import {
    AppwriteException,
    ID,
    Models,
    Query,
    RealtimeResponseEvent,
    type UploadProgress,
} from "react-native-appwrite";
import { File, UploadType } from "expo-file-system";
import { Platform } from "react-native";

import {
    getAppwriteClient,
    getAppwriteDatabases,
} from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";

export const REPORT_CATEGORIES = [
  "security",
  "traffic",
  "infrastructure",
  "lighting",
  "waste",
  "fire",
  "noise",
  "accident",
] as const;

export const REPORT_STATUSES = ["active", "solved", "false"] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportRatingVote = "truthful" | "false";

export type ReportData = {
  title: string;
  category: ReportCategory;
  description: string;
  lng: number;
  lat: number;
  status?: ReportStatus;
  imageUrls?: string[];
  images?: string;
  locationLabel?: string | null;
};

export type ReportDocument = Models.Document & {
  title: string;
  description: string;
  category: ReportCategory;
  lng: number;
  lat: number;
  status: ReportStatus;
  images: string | null;
  rating: number | null;
  locationLabel?: string | null;
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
  if (typeof report.images !== "string") {
    return [];
  }

  return report.images
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeReportRating(rating: ReportDocument["rating"]): number {
  return typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
}

export async function uploadReportMedia(input: UploadMediaInput): Promise<Models.File> {
  const env = getAppwriteEnv();
  const client = getAppwriteClient();
  const mimeType = input.mimeType ?? "image/jpeg";
  const file = new File(input.uri);
  const fileSize = input.fileSize ?? file.size ?? 0;
  const fileId = ID.unique();
  const url = `${env.endpoint}/storage/buckets/${encodeURIComponent(env.reportsBucketId)}/files`;
  const headers = {
    ...client.getHeaders(),
    "X-Appwrite-Project": env.projectId,
    Origin: `appwrite-${Platform.OS}://${client.config.platform ?? ""}`,
    accept: "application/json",
  };

  const result = await file.upload(url, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    headers,
    parameters: {
      fileId,
    },
    onProgress: input.onProgress
      ? (progress) => {
          input.onProgress?.({
            $id: fileId,
            progress: fileSize > 0 ? (progress.bytesSent / progress.totalBytes) * 100 : 0,
            sizeUploaded: progress.bytesSent,
            chunksTotal: 1,
            chunksUploaded: progress.bytesSent >= progress.totalBytes ? 1 : 0,
          });
        }
      : undefined,
  });

  if (result.status >= 400) {
    let message = "No se pudo subir la imagen.";
    let type = "";

    try {
      const errorBody = JSON.parse(result.body) as { message?: string; type?: string };
      message = errorBody.message ?? message;
      type = errorBody.type ?? type;
    } catch {
      if (result.body) {
        message = result.body;
      }
    }

    throw new AppwriteException(message, result.status, type, result.body);
  }

  return JSON.parse(result.body) as Models.File;
}

export function getReportMediaPreviewUrl(fileId: string): string {
  const env = getAppwriteEnv();
  return `${env.endpoint}/storage/buckets/${env.reportsBucketId}/files/${fileId}/view?project=${env.projectId}`;
}

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
