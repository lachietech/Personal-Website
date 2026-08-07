import { useEffect } from "react";
import { loadScripts } from "./legacyRuntime.js";

export function LegacyApplication({ snapshot, scripts, name }) {
  useEffect(() => {
    document.body.className = snapshot.bodyClassName;

    loadScripts(scripts).catch((error) => {
      console.error(`Unable to start the ${name} application:`, error);
    });
  }, [name, scripts, snapshot.bodyClassName]);

  return (
    <div
      className="react-legacy-shell"
      style={{ display: "contents" }}
      dangerouslySetInnerHTML={{ __html: snapshot.html }}
    />
  );
}
