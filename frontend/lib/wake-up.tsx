"use client";
import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Silently pings the backend /health endpoint on every page load.
 * This wakes up Render's free-tier container before users try to login/run audits.
 * Also restores the saved light/dark theme from localStorage.
 */
export default function WakeUpPing() {
  useEffect(() => {
    // ── Wake up backend ────────────────────────────────────────────────────
    fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {
      // Silently ignore — just warming up the backend
    });

    // ── Restore theme ──────────────────────────────────────────────────────
    const saved = localStorage.getItem("fairlens_theme");
    if (saved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  return null; // Renders nothing
}
