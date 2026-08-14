import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('fairlens_token');
    const savedUser = localStorage.getItem('fairlens_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse cached user:', e);
        localStorage.removeItem('fairlens_token');
        localStorage.removeItem('fairlens_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('fairlens_token', data.access_token);
    localStorage.setItem('fairlens_user', JSON.stringify(data.user));
    return data;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('fairlens_token', data.access_token);
    localStorage.setItem('fairlens_user', JSON.stringify(data.user));
    return data;
  };

  const googleLogin = async (credential) => {
    const data = await authApi.googleLogin(credential);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('fairlens_token', data.access_token);
    localStorage.setItem('fairlens_user', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fairlens_token');
    localStorage.removeItem('fairlens_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, logout, isAuthenticated: !!token }}>
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
