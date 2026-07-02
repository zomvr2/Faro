import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  deleteReportDocument,
  getReportRatingVoteDelta,
  getOptimisticReportStatusVoteUpdate,
  getStoredReportRatingVote,
  getStoredReportStatusVote,
  listLatestReports,
  subscribeToReports,
  updateReportDocument,
  voteReportRating,
  voteReportStatus,
  type ReportDocument,
  type ReportRatingVote,
  type ReportStatusVote,
  type ReportUpdateData,
} from "@/services/appwrite";
import {
  getLocalDeviceAccountId,
  isReportOwnedByLocalAccount,
} from "@/services/device";
import { getReportRating } from "@/shared/reports/reportSelectors";

export function useMapReports() {
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [selectedReportRatingVote, setSelectedReportRatingVote] = useState<ReportRatingVote | null>(null);
  const [selectedReportStatusVote, setSelectedReportStatusVote] = useState<ReportStatusVote | null>(null);
  const [pendingVoteReportId, setPendingVoteReportId] = useState<string | null>(null);
  const [pendingStatusVoteReportId, setPendingStatusVoteReportId] = useState<string | null>(null);
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<string | null>(null);
  const [pendingUpdateReportId, setPendingUpdateReportId] = useState<string | null>(null);
  const [localDeviceAccountId, setLocalDeviceAccountId] = useState<string | null>(null);

  useEffect(() => {
    let shouldIgnoreAccount = false;

    const loadLocalDeviceAccount = async () => {
      try {
        const accountId = await getLocalDeviceAccountId();

        if (!shouldIgnoreAccount) {
          setLocalDeviceAccountId(accountId);
        }
      } catch {
        // The map remains usable even if the local account cannot be read.
      }
    };

    void loadLocalDeviceAccount();

    return () => {
      shouldIgnoreAccount = true;
    };
  }, []);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const latestReports = await listLatestReports(120);
        setReports(latestReports);
        setSelectedReport((currentReport) => {
          if (!currentReport) {
            return null;
          }

          return latestReports.find((report) => report.$id === currentReport.$id) ?? currentReport;
        });
      } catch {
        // Keep the map usable even if report loading fails.
      }
    };

    void loadReports();

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToReports(() => {
        void loadReports();
      });
    } catch {
      // Realtime can fail if env is missing; fallback to initial load only.
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  const selectReport = useCallback((report: ReportDocument | null) => {
    setSelectedReport(report);
  }, []);

  useEffect(() => {
    let shouldIgnoreVote = false;

    if (!selectedReport) {
      setSelectedReportRatingVote(null);
      return;
    }

    const loadSelectedReportRatingVote = async () => {
      const storedVote = await getStoredReportRatingVote(selectedReport.$id);

      if (!shouldIgnoreVote) {
        setSelectedReportRatingVote(storedVote);
      }
    };

    void loadSelectedReportRatingVote();

    return () => {
      shouldIgnoreVote = true;
    };
  }, [selectedReport?.$id]);

  useEffect(() => {
    let shouldIgnoreVote = false;

    if (!selectedReport) {
      setSelectedReportStatusVote(null);
      return;
    }

    const loadSelectedReportStatusVote = async () => {
      const storedVote = await getStoredReportStatusVote(selectedReport.$id);

      if (!shouldIgnoreVote) {
        setSelectedReportStatusVote(storedVote);
      }
    };

    void loadSelectedReportStatusVote();

    return () => {
      shouldIgnoreVote = true;
    };
  }, [selectedReport?.$id]);

  const voteSelectedReport = useCallback(async (vote: ReportRatingVote) => {
    if (!selectedReport || pendingVoteReportId) {
      return;
    }

    const reportId = selectedReport.$id;
    const previousReport = selectedReport;

    setPendingVoteReportId(reportId);

    try {
      const previousVote = await getStoredReportRatingVote(reportId);
      const voteDelta = getReportRatingVoteDelta(previousVote, vote);

      if (voteDelta === 0) {
        return;
      }

      const optimisticReport = {
        ...selectedReport,
        rating: getReportRating(selectedReport) + voteDelta,
      };

      setSelectedReportRatingVote(vote);
      setSelectedReport(optimisticReport);
      setReports((currentReports) =>
        currentReports.map((report) => (report.$id === reportId ? optimisticReport : report))
      );

      const updatedReport = await voteReportRating(reportId, vote);

      setReports((currentReports) =>
        currentReports.map((report) => (report.$id === reportId ? updatedReport : report))
      );
      setSelectedReport((currentReport) =>
        currentReport?.$id === reportId ? updatedReport : currentReport
      );
    } catch (error) {
      setSelectedReportRatingVote(await getStoredReportRatingVote(reportId));
      setReports((currentReports) =>
        currentReports.map((report) => (report.$id === reportId ? previousReport : report))
      );
      setSelectedReport((currentReport) =>
        currentReport?.$id === reportId ? previousReport : currentReport
      );

      Alert.alert(
        "No se pudo registrar el voto",
        error instanceof Error ? error.message : "Intentalo nuevamente en unos segundos."
      );
    } finally {
      setPendingVoteReportId((currentReportId) => (currentReportId === reportId ? null : currentReportId));
    }
  }, [pendingVoteReportId, selectedReport]);

  const voteSelectedReportStatus = useCallback(async (vote: ReportStatusVote) => {
    if (!selectedReport || pendingStatusVoteReportId) {
      return;
    }

    const reportId = selectedReport.$id;
    const previousReport = selectedReport;

    setPendingStatusVoteReportId(reportId);

    try {
      const previousVote = await getStoredReportStatusVote(reportId);

      if (previousVote === vote) {
        return;
      }

      const optimisticStatusUpdate = getOptimisticReportStatusVoteUpdate(
        selectedReport,
        previousVote,
        vote
      );
      const optimisticReport = {
        ...selectedReport,
        ...optimisticStatusUpdate,
      };

      setSelectedReportStatusVote(vote);
      setSelectedReport(optimisticReport);
      setReports((currentReports) =>
        currentReports.map((report) => (report.$id === reportId ? optimisticReport : report))
      );

      const updatedReport = await voteReportStatus(reportId, vote);

      setReports((currentReports) =>
        currentReports.map((report) => (report.$id === reportId ? updatedReport : report))
      );
      setSelectedReport((currentReport) =>
        currentReport?.$id === reportId ? updatedReport : currentReport
      );
    } catch (error) {
      setSelectedReportStatusVote(await getStoredReportStatusVote(reportId));
      setReports((currentReports) =>
        currentReports.map((report) => (report.$id === reportId ? previousReport : report))
      );
      setSelectedReport((currentReport) =>
        currentReport?.$id === reportId ? previousReport : currentReport
      );

      Alert.alert(
        "No se pudo actualizar el estado",
        error instanceof Error ? error.message : "Intentalo nuevamente en unos segundos."
      );
    } finally {
      setPendingStatusVoteReportId((currentReportId) => (
        currentReportId === reportId ? null : currentReportId
      ));
    }
  }, [pendingStatusVoteReportId, selectedReport]);

  const selectedReportIsOwnReport = useMemo(
    () => isReportOwnedByLocalAccount(selectedReport, localDeviceAccountId),
    [localDeviceAccountId, selectedReport]
  );

  const deleteSelectedOwnReport = useCallback((onDeleted?: () => void) => {
    if (!selectedReport || pendingDeleteReportId) {
      return;
    }

    if (!isReportOwnedByLocalAccount(selectedReport, localDeviceAccountId)) {
      Alert.alert("Accion no disponible", "Solo puedes eliminar reportes creados desde este dispositivo.");
      return;
    }

    const reportId = selectedReport.$id;

    Alert.alert(
      "Eliminar reporte",
      "Esta accion quitara el reporte del mapa y del feed.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setPendingDeleteReportId(reportId);

            void (async () => {
              try {
                await deleteReportDocument(reportId);
                setReports((currentReports) =>
                  currentReports.filter((report) => report.$id !== reportId)
                );
                setSelectedReport((currentReport) =>
                  currentReport?.$id === reportId ? null : currentReport
                );
                onDeleted?.();
              } catch (error) {
                Alert.alert(
                  "No se pudo eliminar",
                  error instanceof Error ? error.message : "Intentalo nuevamente en unos segundos."
                );
              } finally {
                setPendingDeleteReportId((currentReportId) => (
                  currentReportId === reportId ? null : currentReportId
                ));
              }
            })();
          },
        },
      ]
    );
  }, [localDeviceAccountId, pendingDeleteReportId, selectedReport]);

  const updateSelectedOwnReport = useCallback(async (data: ReportUpdateData): Promise<boolean> => {
    if (!selectedReport || pendingUpdateReportId) {
      return false;
    }

    if (!isReportOwnedByLocalAccount(selectedReport, localDeviceAccountId)) {
      Alert.alert("Accion no disponible", "Solo puedes editar reportes creados desde este dispositivo.");
      return false;
    }

    const reportId = selectedReport.$id;
    setPendingUpdateReportId(reportId);

    try {
      const updatedReport = await updateReportDocument(reportId, data);

      setReports((currentReports) =>
        currentReports.map((report) => (report.$id === reportId ? updatedReport : report))
      );
      setSelectedReport((currentReport) =>
        currentReport?.$id === reportId ? updatedReport : currentReport
      );

      return true;
    } catch (error) {
      Alert.alert(
        "No se pudo guardar",
        error instanceof Error ? error.message : "Intentalo nuevamente en unos segundos."
      );
      return false;
    } finally {
      setPendingUpdateReportId((currentReportId) => (
        currentReportId === reportId ? null : currentReportId
      ));
    }
  }, [localDeviceAccountId, pendingUpdateReportId, selectedReport]);

  return {
    deleteSelectedOwnReport,
    isSelectedReportStatusVoting: selectedReport ? pendingStatusVoteReportId === selectedReport.$id : false,
    isSelectedReportDeleting: selectedReport ? pendingDeleteReportId === selectedReport.$id : false,
    isSelectedReportUpdating: selectedReport ? pendingUpdateReportId === selectedReport.$id : false,
    isSelectedReportVoting: selectedReport ? pendingVoteReportId === selectedReport.$id : false,
    reports,
    selectedReport,
    selectedReportIsOwnReport,
    selectedReportRatingVote,
    selectedReportStatusVote,
    selectReport,
    updateSelectedOwnReport,
    voteSelectedReport,
    voteSelectedReportStatus,
  };
}
