import { toast } from "@/hooks/use-toast";

const API_URL = 'http://localhost:3000/api';

const getHeaders = () => {
  const token = localStorage.getItem('traffic_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const fetchMyReports = async (page = 1, limit = 5, search = '', sortBy = 'created_at', order = 'DESC') => {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    sortBy,
    order
  });
  const response = await fetch(`${API_URL}/reports/my?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch reports');
  return response.json();
};

export const fetchAdminReports = async (page = 1, limit = 5, search = '', sortBy = 'created_at', order = 'DESC') => {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    sortBy,
    order
  });
  const response = await fetch(`${API_URL}/admin/reports?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch reports');
  return response.json();
};

export const createReport = async (data: any) => {
  const response = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create report');
  return response.json();
};

export const updateReportStatus = async (id: number, status: string) => {
  const response = await fetch(`${API_URL}/reports/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update report');
  return response.json();
};

export const markReportAsHandled = async (id: number) => {
  return updateReportStatus(id, 'in_progress');
};

export const markReportAsCompleted = async (id: number) => {
  return updateReportStatus(id, 'completed');
};

export const deleteReport = async (id: number) => {
  const response = await fetch(`${API_URL}/reports/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete report');
  return response.json();
};