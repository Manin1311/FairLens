import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL 
  || import.meta.env.VITE_API_BASE
  || import.meta.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8000';

const API_BASE = rawBase.replace(/\/+$/, '');

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 45000,
});

// Attach token from localStorage to all requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fairlens_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('fairlens_token');
      localStorage.removeItem('fairlens_user');
    }
    return Promise.reject(error);
  }
);

// ─── API Methods ─────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  googleLogin: async (credential) => {
    const res = await api.post('/auth/google', { credential });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};

export const auditApi = {
  // Column detection
  detectColumns: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/audit/detect-columns', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Run full audit
  runAudit: async (formData) => {
    const res = await api.post('/audit/run', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Get user audit detail
  getAudit: async (id) => {
    const res = await api.get(`/audit/${id}`);
    return res.data;
  },

  // Delete audit
  deleteAudit: async (id) => {
    const res = await api.delete(`/audit/${id}`);
    return res.data;
  },

  // Toggle sharing
  toggleShare: async (id) => {
    const res = await api.patch(`/audit/${id}/share`);
    return res.data;
  },

  // Public audit view
  getPublicAudit: async (id) => {
    const res = await api.get(`/audit/public/${id}`);
    return res.data;
  },

  // Re-explain in language
  reExplain: async (id, language) => {
    const res = await api.post(`/audit/${id}/re-explain?language=${language}`);
    return res.data;
  },

  // Ask question chat
  askQuestion: async (auditId, question) => {
    const res = await api.post('/audit/chat', { audit_id: auditId, question });
    return res.data;
  },

  // PDF Report download
  downloadReport: (auditId) => {
    const token = localStorage.getItem('fairlens_token');
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE}/api/report/${auditId}/pdf${tokenParam}`;
  },

  // ─── FairLens 2.0 Demo Endpoints ───────────────────────────────────────────
  runDemoQuick: async (datasetName) => {
    const res = await api.post(`/audit/demo/${datasetName}/quick`);
    return res.data;
  },
  runDemoExplain: async (datasetName) => {
    const res = await api.post(`/audit/demo/${datasetName}/explain`);
    return res.data;
  },
  mitigateDemo: async (datasetName, payload) => {
    const res = await api.post(`/audit/demo/${datasetName}/mitigate`, payload);
    return res.data;
  },
  intersectionalDemo: async (datasetName, payload) => {
    const res = await api.post(`/audit/demo/${datasetName}/intersectional`, payload);
    return res.data;
  },
  counterfactualDemo: async (datasetName, payload) => {
    const res = await api.post(`/audit/demo/${datasetName}/counterfactual`, payload);
    return res.data;
  },
  complianceDemo: async (datasetName) => {
    const res = await api.get(`/audit/demo/${datasetName}/compliance`);
    return res.data;
  },

  // ─── FairLens 2.0 Existing Audit Operations ──────────────────────────────
  mitigateAudit: async (auditId, payload) => {
    const res = await api.post(`/audit/${auditId}/mitigate`, payload);
    return res.data;
  },
  intersectionalAudit: async (auditId, payload) => {
    const res = await api.post(`/audit/${auditId}/intersectional`, payload);
    return res.data;
  },
  counterfactualAudit: async (auditId, payload) => {
    const res = await api.post(`/audit/${auditId}/counterfactual`, payload);
    return res.data;
  },

  // ─── FairLens 2.0 Custom File Endpoints ────────────────────────────────────
  mitigateCustom: async (formData) => {
    const res = await api.post('/audit/custom/mitigate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  intersectionalCustom: async (formData) => {
    const res = await api.post('/audit/custom/intersectional', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  counterfactualCustom: async (formData) => {
    const res = await api.post('/audit/custom/counterfactual', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // ─── FairLens 2.0 Generative AI / LLM Bias Auditor ─────────────────────────
  auditLlmText: async (payload) => {
    const res = await api.post('/audit/llm-audit', payload);
    return res.data;
  }
};
