import { useCallback, useEffect, useState } from "react";
import { getProjects } from "../api/siteApi.js";

const REFRESH_INTERVAL = 30_000;

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await getProjects());
      setError("");
    } catch {
      setError("Projects are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshProjects();
      }
    };
    const refreshTimer = window.setInterval(refreshProjects, REFRESH_INTERVAL);

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshProjects]);

  return { projects, loading, error };
}
