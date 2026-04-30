import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("fairlens_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("fairlens_token");
      localStorage.removeItem("fairlens_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; name: string; organization?: string; password: string }) =>
    api.post("/api/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
  googleAuth: (credential: string) =>
    api.post("/api/auth/google", { credential }),
};


// ─── Audit ────────────────────────────────────────────────────────────────────
export const auditAPI = {
  detectColumns: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/audit/detect-columns", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  runAudit: (
    file: File,
    name: string,
    sensitiveColumns: string[],
    targetColumn: string,
    predictionColumn?: string,
    language: string = "English"
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", name);
    form.append("sensitive_columns", JSON.stringify(sensitiveColumns));
    form.append("target_column", targetColumn);
    form.append("language", language);
    if (predictionColumn) form.append("prediction_column", predictionColumn);
    return api.post("/api/audit/run", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: () => api.get("/api/audit/"),
  get: (id: number) => api.get(`/api/audit/${id}`),
  chat: (auditId: number, question: string) =>
    api.post("/api/audit/chat", { audit_id: auditId, question }),
  delete: (id: number) => api.delete(`/api/audit/${id}`),
  runDemo: (dataset: string) => api.post(`/api/audit/demo/${dataset}`),
  runDemoQuick: (dataset: string) => api.post(`/api/audit/demo/${dataset}/quick`),
  runDemoExplain: (dataset: string) => api.post(`/api/audit/demo/${dataset}/explain`),
  reExplain: (id: number, language: string) =>
    api.post(`/api/audit/${id}/re-explain?language=${encodeURIComponent(language)}`),
  toggleShare: (id: number) => api.patch(`/api/audit/${id}/share`),
  getPublic: (id: number) => api.get(`/api/audit/public/${id}`),
};

// ─── Report ───────────────────────────────────────────────────────────────────
export const reportAPI = {
  downloadPDF: async (auditId: number) => {
    const res = await api.get(`/api/report/${auditId}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fairlens_report_${auditId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
