import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface User {
  id: number;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  maxProjects: number;
  maxCompetitors: number;
  maxPrompts: number;
  maxScansPerMonth: number;
  scansThisMonth: number;
  hasApiAccess: boolean;
  hasWhiteLabel: boolean;
  hasScheduledScans: boolean;
  subscriptionStatus: string | null;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  org: Org | null;
  orgs: Org[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, orgName: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrg(data.org);
        setOrgs(data.orgs || []);
      } else {
        setUser(null);
        setOrg(null);
        setOrgs([]);
      }
    } catch {
      setUser(null);
      setOrg(null);
      setOrgs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    setOrg(data.org);
    setOrgs(data.orgs || []);
  };

  const signup = async (email: string, password: string, name: string, orgName: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, orgName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Signup failed");
    }
    const data = await res.json();
    setUser(data.user);
    setOrg(data.org);
    setOrgs([data.org]);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOrg(null);
    setOrgs([]);
  };

  const switchOrg = async (orgId: string) => {
    const res = await fetch("/api/auth/switch-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    if (!res.ok) throw new Error("Failed to switch organization");
    const data = await res.json();
    setOrg(data.org);
    await refreshAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        org,
        orgs,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        switchOrg,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
