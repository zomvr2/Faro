import { File, UploadType } from "expo-file-system";
import { Platform } from "react-native";
import { AppwriteException, ID, Models } from "react-native-appwrite";

import { getAppwriteClient } from "@/services/appwrite/client";
import { getAppwriteEnv } from "@/services/appwrite/env";
import type { UploadMediaInput } from "@/services/appwrite/reports/types";

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
