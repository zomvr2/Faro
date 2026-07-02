import { useCallback, useEffect, useState } from "react";

import {
  listLatestReports,
  subscribeToReports,
  type ReportDocument,
} from "@/services/appwrite";
import { isCoordinatesInServiceArea } from "@/shared/geo/serviceArea";

type UseRealtimeReportsOptions = {
  limit?: number;
  filterServiceArea?: boolean;
};

export function useRealtimeReports({
  limit = 25,
  filterServiceArea = true,
}: UseRealtimeReportsOptions = {}) {
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshReports = useCallback(async () => {
    try {
      const documents = await listLatestReports(limit);
      setReports(filterServiceArea ? documents.filter(isCoordinatesInServiceArea) : documents);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los reportes.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filterServiceArea, limit]);

  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      void refreshReports();
    }, 0);

    let unsubscribe: (() => void) | null = null;
    let errorTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      unsubscribe = subscribeToReports(() => {
        void refreshReports();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo iniciar la conexion en tiempo real.";
      errorTimer = setTimeout(() => {
        setError(message);
      }, 0);
    }

    return () => {
      clearTimeout(refreshTimer);

      if (errorTimer) {
        clearTimeout(errorTimer);
      }

      unsubscribe?.();
    };
  }, [refreshReports]);

  return {
    error,
    isLoading,
    refreshReports,
    reports,
  };
}
