import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
const defaults = { grades: [{ label: 'A+', min: 90 }, { label: 'A', min: 80 }, { label: 'B', min: 70 }, { label: 'C', min: 60 }, { label: 'D', min: 50 }, { label: 'F', min: 0 }], passMark: 40, revision: -1 };
const endpoints = {
  admin: { users: '/users', reports: '/reports', mappings: '/assignments', settings: '/grading-settings', classes: '/classes', subjects: '/subjects', stats: '/admin/dashboard' },
  teacher: { users: '/teacher/students', reports: '/reports', mappings: '/assignments', settings: '/grading-settings' },
  student: { reports: '/reports', settings: '/grading-settings', summary: '/student/summary' },
};
export function usePortal(role) {
  const [data, setData] = useState({ users: [], reports: [], mappings: [], classes: [], subjects: [], settings: defaults, stats: null, summary: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const generation = useRef(0);
  const mounted = useRef(false);
  const saving = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const values = await Promise.all(Object.entries(endpoints[role]).map(async ([key, path]) => [key, await api(path)]));
      if (mounted.current && request === generation.current) { setData(prev => ({ ...prev, ...Object.fromEntries(values) })); setError(''); }
    } catch (err) { if (mounted.current && request === generation.current) setError(err.message); }
    finally { if (mounted.current && request === generation.current) setLoading(false); }
  }, [role]);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) refresh();
    });

    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [refresh]);
  const mutate = async (path, method, body) => {
    if (saving.current) return null;
    saving.current = true;
    setBusy(true); setActionError('');
    try { const result = await api(path, { method, body }); await refresh(); return result; }
    catch (err) { setActionError(err.message); return null; }
    finally { saving.current = false; setBusy(false); }
  };
  return { ...data, loading, busy, error: actionError || error, refresh: () => { setActionError(''); return refresh(); }, mutate };
}
