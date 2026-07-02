import type { Models, UploadProgress } from "react-native-appwrite";

import {
  REPORT_CATEGORIES,
  REPORT_STATUSES,
} from "@/shared/reports/constants";
import type {
  ReportCategory,
  ReportRatingVote,
  ReportStatus,
  ReportStatusVote,
} from "@/shared/reports/types";

export { REPORT_CATEGORIES, REPORT_STATUSES };
export type { ReportCategory, ReportRatingVote, ReportStatus, ReportStatusVote };

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
  activeVotes?: number | null;
  solvedVotes?: number | null;
  falseVotes?: number | null;
  statusTimeline?: string | null;
};

export type UploadMediaInput = {
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  onProgress?: (progress: UploadProgress) => void;
};
