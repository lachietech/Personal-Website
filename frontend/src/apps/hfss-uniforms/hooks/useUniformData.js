import { useCallback, useEffect, useState } from "react";
import { uniformRequest } from "../api/uniformApi.js";

export function useUniformData(
  path,
  { dependencies = [], initialData = null } = {},
) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await uniformRequest(path));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [path, ...dependencies]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}
