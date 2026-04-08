/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Load user and token from localStorage on fresh reload
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken) {
        setToken(storedToken);
        if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error("Failed to parse stored user", e);
            localStorage.removeItem('user'); // Clear corrupted data
          }
        }
        
        // Refresh user from backend when API is reachable
        try {
          const freshUser = await authService.getMe();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (e) {
          const status = e.response?.status;
          // 401: invalid/expired token — clear session
          if (status === 401) {
            logout();
          } else if (
            !e.response ||
            status === 502 ||
            status === 503 ||
            status === 504
          ) {
            // No response, or gateway/upstream errors: backend down, proxy misconfigured,
            // host cold-start (e.g. Render), timeout — keep cached user; do not logout
            if (import.meta.env.DEV) {
              const hint =
                status === 502
                  ? '502 = proxy could not reach API (is uvicorn running on :8000? MongoDB reachable?)'
                  : 'API temporarily unavailable';
              console.warn(`[FinSight] Session sync skipped (${hint}). Using cached session.`);
            }
          } else {
            console.error('Session sync failed', e);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authService.login({ email, password });
      const { access_token, user: userData } = data;
      
      // Store token
      setToken(access_token);
      localStorage.setItem('token', access_token);
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      return { success: false, message };
    }
  };

  const register = async (name, email, password) => {
    try {
      await authService.register({ name, email, password });
      // After successful registration, automatically log them in
      return await login(email, password);
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

