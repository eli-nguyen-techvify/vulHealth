import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function currentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch (e) { return null; }
}

export function setAuth(token, user) {
  if (token) localStorage.setItem('token', token); else localStorage.removeItem('token');
  if (user)  localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user');
}

export function logout() {
  setAuth(null, null);
}

export default api;
