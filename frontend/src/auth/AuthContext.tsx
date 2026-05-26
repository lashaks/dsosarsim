import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../api/client";
import type { User } from "../api/types";

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("dsos-token"));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("dsos-user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // On boot, verify token by hitting /me — if invalid, clear local state.
    if (token && !user) {
      setLoading(true);
      api
        .get<User>("/api/auth/me")
        .then((r) => {
          setUser(r.data);
          localStorage.setItem("dsos-user", JSON.stringify(r.data));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem("dsos-token");
          localStorage.removeItem("dsos-user");
        })
        .finally(() => setLoading(false));
    }
  }, []); // eslint-disable-line

  async function login(username: string, password: string) {
    setLoading(true);
    try {
      const r = await api.post("/api/auth/login-json", { username, password });
      setToken(r.data.access_token);
      setUser(r.data.user);
      localStorage.setItem("dsos-token", r.data.access_token);
      localStorage.setItem("dsos-user", JSON.stringify(r.data.user));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("dsos-token");
    localStorage.removeItem("dsos-user");
    window.location.href = "/login";
  }

  return <Ctx.Provider value={{ user, token, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
