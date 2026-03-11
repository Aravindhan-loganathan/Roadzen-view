import { API_BASE_URL } from './apiConfig';

const BASE_URL = `${API_BASE_URL}/auth`;

export const fetchAllUsers = async () => {
  const token = localStorage.getItem('traffic_token');

  const res = await fetch(`${BASE_URL}/admin/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
};
