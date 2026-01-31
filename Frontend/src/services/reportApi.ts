import { Report } from '@/types/report';

const BASE_URL = 'http://localhost:3000/api';

/**
 * USER: Submit a new report
 */
export const submitReport = async (form: {
  type: string;
  severity: string;
  description: string;
  location: string;
}) => {
  const token = localStorage.getItem('traffic_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('http://localhost:3000/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit report');
  }

  return response.json();
};

export const fetchMyReports = async () => {
  const token = localStorage.getItem('traffic_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('http://localhost:3000/api/reports/my', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }

  return response.json();
};

/**
 * ADMIN: Fetch all user reports (severity sorted by backend)
 */
export const fetchAllReports = async (): Promise<Report[]> => {
  const res = await fetch(`${BASE_URL}/admin/reports`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch all reports');
  }

  return res.json();
};

export const markReportAsHandled = async (reportId: number) => {
  const token = localStorage.getItem('traffic_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`http://localhost:3000/api/admin/reports/${reportId}/handle`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'in_progress' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update report');
  }

  return response.json();
};
