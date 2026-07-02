import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import {
  getReportRatingVoteDelta,
  getStoredReportRatingVote,
  listLatestReports,
  subscribeToReports,
  voteReportRating,
  type ReportDocument,
  type ReportRatingVote,
} from "@/services/appwrite";
import { getReportRating } from "@/shared/reports/reportSelectors";

export function useMapReports() {
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDocument | null>(null);
  const [selectedReportRatingVote, setSelectedReportRatingVote] = useState<ReportRatingVote | null>(null);
  const [pendingVoteReportId, setPendingVoteReportId] = useState<string | null>(null);

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

  return {
    isSelectedReportVoting: selectedReport ? pendingVoteReportId === selectedReport.$id : false,
    reports,
    selectedReport,
    selectedReportRatingVote,
    selectReport,
    voteSelectedReport,
  };
}
