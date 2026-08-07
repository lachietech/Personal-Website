export function capturePageMarkup() {
  document.body.querySelectorAll("script").forEach((script) => script.remove());

  return {
    bodyClassName: document.body.className,
    html: document.body.innerHTML,
  };
}

export async function loadScripts(scripts) {
  for (const scriptDefinition of scripts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const definition =
        typeof scriptDefinition === "string"
          ? { src: scriptDefinition }
          : scriptDefinition;

      script.src = definition.src;
      script.type = definition.type || "text/javascript";
      script.onload = resolve;
      script.onerror = () => {
        reject(new Error(`Unable to load ${definition.src}`));
      };
      document.body.appendChild(script);
    });
  }
}
