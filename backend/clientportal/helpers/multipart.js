import path from "path";

export function parseMultipartReceipt(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      reject(new Error("Receipt upload must be multipart form data"));
      return;
    }

    const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        req.destroy(new Error("Receipt file must be under 2MB"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("error", reject);
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      let offset = body.indexOf(boundary);

      while (offset >= 0) {
        const nextOffset = body.indexOf(boundary, offset + boundary.length);
        if (nextOffset < 0) {
          break;
        }

        const part = body.subarray(offset + boundary.length + 2, nextOffset - 2);
        const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
        if (headerEnd >= 0) {
          const headers = part.subarray(0, headerEnd).toString("utf8");
          const fileData = part.subarray(headerEnd + 4);
          const filename = headers.match(/filename="([^"]+)"/i)?.[1];
          const fieldName = headers.match(/name="([^"]+)"/i)?.[1];
          const type = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1];

          if (fieldName === "receipt" && filename && fileData.length) {
            resolve({
              filename: path.basename(filename).slice(0, 180),
              contentType: (type || "application/octet-stream").trim().slice(0, 100),
              data: fileData
            });
            return;
          }
        }
        offset = nextOffset;
      }

      reject(new Error("Receipt file is required"));
    });
  });
}
