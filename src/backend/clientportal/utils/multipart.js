import path from "path";

const ALLOWED_RECEIPT_TYPES = new Map([
  ["application/pdf", (data) => data.subarray(0, 5).toString() === "%PDF-"],
  ["image/jpeg", (data) => data[0] === 0xff && data[1] === 0xd8],
  [
    "image/png",
    (data) =>
      data
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        ),
  ],
  [
    "image/webp",
    (data) =>
      data.subarray(0, 4).toString() === "RIFF" &&
      data.subarray(8, 12).toString() === "WEBP",
  ],
]);

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

        const part = body.subarray(
          offset + boundary.length + 2,
          nextOffset - 2,
        );
        const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
        if (headerEnd >= 0) {
          const headers = part.subarray(0, headerEnd).toString("utf8");
          const fileData = part.subarray(headerEnd + 4);
          const filename = headers.match(/filename="([^"]+)"/i)?.[1];
          const fieldName = headers.match(/name="([^"]+)"/i)?.[1];
          const type = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1];

          if (fieldName === "receipt" && filename && fileData.length) {
            const safeContentType = (type || "").trim().toLowerCase();
            const signatureMatches = ALLOWED_RECEIPT_TYPES.get(safeContentType);
            if (!signatureMatches || !signatureMatches(fileData)) {
              reject(new Error("Receipt must be a PDF, JPEG, PNG, or WebP file"));
              return;
            }
            resolve({
              filename: path.basename(filename).slice(0, 180),
              contentType: safeContentType,
              data: fileData,
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
