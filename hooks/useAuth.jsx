"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, claimLocalNotes } from "@/lib/api-client";

const AuthCtx = createContext({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api("/auth/me");
      setUser(user);
      if (user) claimLocalNotes();
      return user;
    } catch { setUser(null); return null; }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, refresh, logout, setUser }}>{children}</AuthCtx.Provider>;
}
