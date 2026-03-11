import { API_BASE_URL } from './apiConfig';

const BASE_URL = API_BASE_URL;

export interface ViolationForm {
  type: string;
  vehicle_number: string;
  location: string;
  fine_amount: number;
  status: string;
}

export interface Violation extends ViolationForm {
  id: number;
  timestamp: string;
}

export interface ViolationFilters {
  status?: string;
  type?: string;
  location?: string;
  dateRange?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create a new violation (Admin only)
 */
export const createViolation = async (form: ViolationForm) => {
  const token = localStorage.getItem('traffic_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${BASE_URL}/violations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create violation');
  }

  return response.json();
};

/**
 * Update an existing violation
 */
export const updateViolation = async (id: number, form: Partial<ViolationForm>) => {
  const token = localStorage.getItem('traffic_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${BASE_URL}/violations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update violation');
  }

  return response.json();
};

/**
 * Get all violations with optional filters
 */
export const getViolations = async (filters?: ViolationFilters) => {
  const token = localStorage.getItem('traffic_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const params = new URLSearchParams();
  
  if (filters) {
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.location) params.append('location', filters.location);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
  }

  const response = await fetch(`${BASE_URL}/violations?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch violations');
  }

  return response.json();
};

/**
 * Get all unique locations/junctions
 */
export const getLocations = async () => {
  const token = localStorage.getItem('traffic_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${BASE_URL}/violations/locations/list`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch locations');
  }

  return response.json();
};
