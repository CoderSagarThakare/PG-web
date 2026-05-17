import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getUserProfileApi } from '../api/profile.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch the full profile from server and sync into state + localStorage.
   * Called after login and on app mount when a token exists.
   * This ensures the picture (presigned URL) is always fresh.
   */
  const syncProfile = useCallback(async (role) => {
    try {
      const isStaffRole = ['owner', 'manager', 'employee'].includes(role);
      // Staff and user both share the User model and the avatar endpoint.
      // getUserProfileApi works for 'user' role only; for staff roles we skip
      // the profile sync (staff profile already handled at login via login response).
      if (isStaffRole) return;

      const res = await getUserProfileApi();
      const fresh = res.data?.data;
      if (!fresh) return;

      setUser(prev => {
        const merged = { ...prev, ...fresh };
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
    } catch {
      // Non-fatal: user stays logged in with cached data
    }
  }, []);

  // Guard ref: ensures syncProfile is called only ONCE on mount.
  // React 18 StrictMode double-fires effects in dev — the ref survives remounts.
  const syncCalled = useRef(false);

  useEffect(() => {
    if (syncCalled.current) return;  // Already ran — skip the StrictMode second fire
    if (token && user?.role) {
      syncCalled.current = true;
      syncProfile(user.role);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (userData, authToken) => {
    // Store core login data immediately (so the app can render)
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);

    // Then fetch the full profile (includes fresh presigned picture URL)
    // Use the role from login data to pick the right endpoint
    await syncProfile(userData.role);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateUser = (updatedData) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  const isOwner    = user?.role === 'owner';
  const isManager  = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';
  const isUser     = user?.role === 'user';
  const isStaff    = isOwner || isManager || isEmployee;

  return (
    <AuthContext.Provider value={{
      user, token, loading, setLoading,
      login, logout, updateUser, syncProfile,
      isOwner, isManager, isEmployee, isUser, isStaff,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
