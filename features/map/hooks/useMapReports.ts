import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import {
  getReportRatingVoteDelta,
  getOptimisticReportStatusVoteUpdate,
  getStoredReportRatingVote,
  getStoredReportStatusVote,
  listLatestReports,
  subscribeToReports,
  voteReportRating,
  voteReportStatus,
  type ReportDocument,
  type ReportRatingVote,
  type ReportStatusVote,
} from "@/services/appwrite";
import { getReportRating } from "@/shared/reports/reportSelectors";

export function useMapReports() {
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [selectedReportRatingVote, setSelectedReportRatingVote] = useState<ReportRatingVote | null>(null);
  const [selectedReportStatusVote, setSelectedReportStatusVote] = useState<ReportStatusVote | null>(null);
  const [pendingVoteReportId, setPendingVoteReportId] = useState<string | null>(null);
  const [pendingStatusVoteReportId, setPendingStatusVoteReportId] = useState<string | null>(null);

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

  return {
    isSelectedReportStatusVoting: selectedReport ? pendingStatusVoteReportId === selectedReport.$id : false,
    isSelectedReportVoting: selectedReport ? pendingVoteReportId === selectedReport.$id : false,
    reports,
    selectedReport,
    selectedReportRatingVote,
    selectedReportStatusVote,
    selectReport,
    voteSelectedReport,
    voteSelectedReportStatus,
  };
}
