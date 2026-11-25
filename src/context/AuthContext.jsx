import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api/client';
import { AuthContext } from './useAuth';

const LEGACY_STORAGE_KEYS = [
  'users',
  'reports',
  'gradingSettings',
  'teacherAssignments',
  'currentUser'
];

function clearLegacyStorage() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.me();
      setUser(data?.user ?? null);
      return data?.user ?? null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    clearLegacyStorage();

    setUnauthorizedHandler(() => {
      setUser(null);
    });

    let active = true;

    (async () => {
      try {
        const data = await api.me();
        if (active) {
          setUser(data?.user ?? null);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async ({ email, password, rememberMe }) => {
    const data = await api.login({ email, password, rememberMe });
    const authenticatedUser = data?.user ?? null;
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Clear client session state even if the network/logout call fails.
    } finally {
      clearLegacyStorage();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser
    }),
    [user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
