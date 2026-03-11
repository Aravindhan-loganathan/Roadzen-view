export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const AI_BASE_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';
export const AI_WS_URL = AI_BASE_URL.replace('http', 'ws');
