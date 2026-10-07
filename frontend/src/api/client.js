import axios from 'axios';

// Production / explicit: VITE_API_URL (e.g. https://your-api.onrender.com/api)
// Dev default: same-origin `/api` → Vite proxy → http://127.0.0.1:8000 (run: cd backend && uvicorn app.main:app --reload)
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '');

if (!API_URL) {
  throw new Error('Missing VITE_API_URL in production environment.');
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure Axios interceptor to automatically attach the JWT token
// to every outgoing request if it exists in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get an unauthorized error, the token is invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login only if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * POST to a server-sent-events endpoint and call onEvent for each JSON event.
 * Uses fetch (axios can't stream in the browser). Resolves when the stream ends.
 */
export async function streamEvents(path, body, { onEvent, signal } = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }
  if (!response.ok || !response.body) {
    throw new Error(`Stream failed with status ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      try {
        onEvent?.(JSON.parse(line.slice(5).trim()));
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }
}
