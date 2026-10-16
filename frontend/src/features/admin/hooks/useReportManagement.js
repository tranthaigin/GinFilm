import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../../../shared/api/client';

const API_PATH = '/reviews/admin/reports';

export const useReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const fetchReports = useCallback((page = 0) => {
    return apiGet(`${API_PATH}?page=${page}`)
      .then((data) => {
        setReports(data.content || []);
        setTotalPages(data.totalPages || 0);
      })
      .catch((error) => {
        console.error('Error fetching reports:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const processReport = async (reportId, action, adminNote) => {
    try {
      await apiPost(`${API_PATH}/${reportId}/process`, { action, adminNote });
      // Cập nhật lại UI: Đổi trạng thái các báo cáo có cùng reviewId
      const processedReport = reports.find((r) => r.reportId === reportId);
      if (processedReport) {
        setReports((prev) =>
          prev.map((r) =>
            r.reviewId === processedReport.reviewId
              ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
              : r
          )
        );
      }
      return true;
    } catch (error) {
      console.error('Error processing report:', error);
      return false;
    }
  };

  const loadKey1 = JSON.stringify([]);
  const [previousLoadKey1, setPreviousLoadKey1] = useState(null);
  if (previousLoadKey1 !== loadKey1) {
    setPreviousLoadKey1(loadKey1);
    setIsLoading(true);
  }

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    isLoading,
    totalPages,
    fetchReports: (...args) => {
      setIsLoading(true);
      return fetchReports(...args);
    },
    processReport,
  };
};
