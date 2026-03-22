import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export function useActiveMenu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const menu = await api.get('/weekmenu/active');
      setData(menu);
      setError(null);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMenu(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const menu = await api.get(`/weekmenu/${id}`);
      setData(menu);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMenus() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/weekmenu');
      setMenus(data);
    } catch {
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { menus, loading, refresh };
}

export function useDay(dayId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!dayId) return;
    try {
      setLoading(true);
      const day = await api.get(`/weekmenu/days/${dayId}`);
      setData(day);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dayId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
