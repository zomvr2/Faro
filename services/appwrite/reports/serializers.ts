import type { ReportData, ReportDocument } from "@/services/appwrite/reports/types";

export function normalizeImagesField(data: ReportData): string {
  const rawUrls = data.images ? data.images.split(",") : data.imageUrls ?? [];

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

export function normalizeReportRating(rating: ReportDocument["rating"]): number {
  return typeof rating === "number" && Number.isFinite(rating) ? rating : 0;
}
