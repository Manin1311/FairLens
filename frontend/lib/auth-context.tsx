"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string;
  organization: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; name: string; organization?: string; password: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("fairlens_token");
    const storedUser = localStorage.getItem("fairlens_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("fairlens_token", access_token);
    localStorage.setItem("fairlens_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const register = async (data: { email: string; name: string; organization?: string; password: string }) => {
    const res = await authAPI.register(data);
    const { access_token, user: userData } = res.data;
    localStorage.setItem("fairlens_token", access_token);
    localStorage.setItem("fairlens_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("fairlens_token");
    localStorage.removeItem("fairlens_user");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
