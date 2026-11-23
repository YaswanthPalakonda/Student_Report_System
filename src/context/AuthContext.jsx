import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setCsrfToken } from '../lib/api';
import { AuthContext } from './auth';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const restore = useCallback(async () => {
    const current = ++revision.current;
    try { const data = await api('/auth/me'); if (current === revision.current) { setUser(data.user); setCsrfToken(data.csrfToken); setError(''); } }
    catch (err) { if (current === revision.current) { if (err.status !== 401) setError(err.message); setUser(null); setCsrfToken(''); } }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) restore(); });
    const expired = () => { setUser(null); setCsrfToken(''); setError(''); };
    window.addEventListener('session-expired', expired);
    return () => { cancelled = true; window.removeEventListener('session-expired', expired); };
  }, [restore]);
  const login = async (email, password) => {
    revision.current++;
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setCsrfToken(data.csrfToken); setUser(data.user); setError(''); return data.user;
  };
  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); setCsrfToken(''); setUser(null); setError(''); }
    catch (err) { if (err.status !== 401) setError(`Logout failed: ${err.message}`); }
  };
  return <AuthContext.Provider value={{ user, loading, error, restore, login, logout }}>{children}</AuthContext.Provider>;
}
