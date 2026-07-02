import { useCallback, useMemo, useState } from "react";
import * as ExpoLocation from "expo-location";
import * as ImagePicker from "expo-image-picker";

import {
  createReportDocument,
  getReportMediaPreviewUrl,
  type ReportCategory,
  type ReportDocument,
  uploadReportMedia,
} from "@/services/appwrite";
import { getApproximateLocationLabel } from "@/services/reverseGeocoding";
import {
  SERVICE_AREA_NAME,
  isCoordinatesInServiceArea,
} from "@/shared/geo/serviceArea";

export const MAX_REPORT_IMAGES = 3;
const DEFAULT_REPORT_CATEGORY: ReportCategory = "security";

export type SelectedMedia = {
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
};

export function useCreateReportForm() {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(DEFAULT_REPORT_CATEGORY);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [uploadProgressByUri, setUploadProgressByUri] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearSubmitError = useCallback(() => {
    setSubmitError(null);
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setSelectedCategory(DEFAULT_REPORT_CATEGORY);
    setSelectedMedia([]);
    setUploadProgressByUri({});
    setSubmitError(null);
  }, []);

  const updateSelectedMedia = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
    if (assets.length === 0) {
      return;
    }

    setSelectedMedia((previous) => {
      const availableSlots = Math.max(0, MAX_REPORT_IMAGES - previous.length);
      const mapped = assets.slice(0, availableSlots).map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? undefined,
        fileSize: asset.fileSize ?? undefined,
      }));

      return [...previous, ...mapped].slice(0, MAX_REPORT_IMAGES);
    });

    setUploadProgressByUri((previous) => {
      const next = { ...previous };

      assets.forEach((asset) => {
        if (asset.uri) {
          next[asset.uri] = 0;
        }
      });

      return next;
    });

    setSubmitError(null);
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    const remainingSlots = MAX_REPORT_IMAGES - selectedMedia.length;

    if (remainingSlots <= 0) {
      setSubmitError("Solo puedes subir hasta 3 imagenes.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setSubmitError("Permite acceso a la galeria para seleccionar imagenes.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    updateSelectedMedia(result.assets);
  }, [selectedMedia.length, updateSelectedMedia]);

  const handleTakePhoto = useCallback(async () => {
    if (selectedMedia.length >= MAX_REPORT_IMAGES) {
      setSubmitError("Solo puedes subir hasta 3 imagenes.");
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setSubmitError("Permite acceso a la camara para tomar una foto.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) {
      return;
    }

    updateSelectedMedia(result.assets);
  }, [selectedMedia.length, updateSelectedMedia]);

  const removeSelectedMedia = useCallback((indexToRemove: number) => {
    setSelectedMedia((previous) => {
      const mediaToRemove = previous[indexToRemove];

      if (mediaToRemove) {
        setUploadProgressByUri((progressMap) => {
          const next = { ...progressMap };
          delete next[mediaToRemove.uri];
          return next;
        });
      }

      return previous.filter((_, index) => index !== indexToRemove);
    });

    setSubmitError(null);
  }, []);

  const totalUploadProgress = useMemo(
    () =>
      selectedMedia.length > 0
        ? Math.round(
            selectedMedia.reduce((sum, media) => sum + (uploadProgressByUri[media.uri] ?? 0), 0) /
              selectedMedia.length
          )
        : 0,
    [selectedMedia, uploadProgressByUri]
  );

  const submitReport = useCallback(async (): Promise<ReportDocument | null> => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setSubmitError("Agrega un titulo antes de publicar.");
      return null;
    }

    if (!trimmedDescription) {
      setSubmitError("Agrega una descripcion antes de publicar.");
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const reportCoordinates = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      if (!isCoordinatesInServiceArea(reportCoordinates)) {
        setSubmitError(`Solo puedes publicar reportes dentro de ${SERVICE_AREA_NAME}.`);
        return null;
      }

      const locationLabel = await getApproximateLocationLabel(reportCoordinates);
      const images =
        selectedMedia.length > 0
          ? (
              await Promise.all(
                selectedMedia.map(async (media) => {
                  const file = await uploadReportMedia({
                    uri: media.uri,
                    fileName: media.fileName,
                    mimeType: media.mimeType,
                    fileSize: media.fileSize,
                    onProgress: (progress) => {
                      setUploadProgressByUri((previous) => ({
                        ...previous,
                        [media.uri]: progress.progress,
                      }));
                    },
                  });

                  setUploadProgressByUri((previous) => ({
                    ...previous,
                    [media.uri]: 100,
                  }));

                  return getReportMediaPreviewUrl(file.$id);
                })
              )
            ).join(",")
          : "";

      const createdReport = await createReportDocument({
        title: trimmedTitle,
        category: selectedCategory,
        description: trimmedDescription,
        lng: reportCoordinates.lng,
        lat: reportCoordinates.lat,
        status: "active",
        locationLabel,
        images,
      });

      resetForm();
      return createdReport;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo publicar el reporte.";
      setSubmitError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [description, resetForm, selectedCategory, selectedMedia, title]);

  return {
    clearSubmitError,
    description,
    handlePickFromLibrary,
    handleTakePhoto,
    isSubmitting,
    removeSelectedMedia,
    selectedCategory,
    selectedMedia,
    setDescription,
    setSelectedCategory,
    setTitle,
    submitError,
    submitReport,
    title,
    totalUploadProgress,
    uploadProgressByUri,
  };
}

export type CreateReportFormController = ReturnType<typeof useCreateReportForm>;
