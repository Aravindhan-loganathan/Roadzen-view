const BASE_URL = 'http://localhost:3000/api/auth';

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
