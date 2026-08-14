import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DemoPage } from './pages/DemoPage';
import { LlmAuditPage } from './pages/LlmAuditPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAuditPage } from './pages/NewAuditPage';
import { AuditDetailPage } from './pages/AuditDetailPage';
import { PublicAuditPage } from './pages/PublicAuditPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/llm-audit" element={<LlmAuditPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/audit/new" element={
            <ProtectedRoute>
              <NewAuditPage />
            </ProtectedRoute>
          } />
          <Route path="/audit/:id" element={
            <ProtectedRoute>
              <AuditDetailPage />
            </ProtectedRoute>
          } />

          {/* Public Sharing */}
          <Route path="/audit/public/:id" element={<PublicAuditPage />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};
