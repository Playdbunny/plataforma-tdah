import { Request } from "express";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ParsedFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export async function readRequestBuffer(
  req: Request,
  limit: number,
  tooLargeMessage: string,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  let done = false;

  return await new Promise<Buffer>((resolve, reject) => {
    const cleanup = () => {
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
    };

    const finish = (err: Error | null, data?: Buffer) => {
      if (done) return;
      done = true;
      cleanup();
      if (err) {
        reject(err);
      } else {
        resolve(data ?? Buffer.concat(chunks));
      }
    };

    const onError = (err: Error) => {
      finish(err);
    };

    const onEnd = () => {
      finish(null);
    };

    const onData = (chunk: Buffer) => {
      if (done) return;
      total += chunk.length;
      if (total > limit) {
        finish(new HttpError(413, tooLargeMessage));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    };

    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
  });
}

export function parseMultipartFile(
  buffer: Buffer,
  boundary: string,
  fieldName: string,
): ParsedFile | null {
  const boundaryMarker = `--${boundary}`;
  const parts = buffer.toString("binary").split(boundaryMarker);

  for (const rawPart of parts) {
    if (!rawPart || rawPart === "--" || rawPart === "--\r\n") continue;

    let part = rawPart;
    if (part.startsWith("\r\n")) {
      part = part.slice(2);
    }
    if (!part.trim()) continue;
    if (part.startsWith("--")) break;

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerSection = part.slice(0, headerEnd);
    let bodySection = part.slice(headerEnd + 4);

    if (bodySection.endsWith("\r\n")) {
      bodySection = bodySection.slice(0, -2);
    }

    const headers = headerSection.split("\r\n");
    const dispositionHeader = headers.find((h) => /^content-disposition:/i.test(h));
    if (!dispositionHeader) continue;

    const nameMatch = dispositionHeader.match(/name="([^"]+)"/i);
    if (!nameMatch || nameMatch[1] !== fieldName) continue;

    const filenameMatch = dispositionHeader.match(/filename="([^"]*)"/i);
    if (!filenameMatch || !filenameMatch[1]) continue;

    const typeHeader = headers.find((h) => /^content-type:/i.test(h));
    const mimeType = typeHeader?.split(":")[1]?.trim() ?? "application/octet-stream";

    const bufferData = Buffer.from(bodySection, "binary");

    return {
      filename: filenameMatch[1],
      mimeType,
      buffer: bufferData,
    };
  }

  return null;
}

export async function extractMultipartFile(
  req: Request,
  {
    field,
    maxSize,
    allowedMime,
    tooLargeMessage,
  }: {
    field: string;
    maxSize: number;
    allowedMime?: RegExp;
    tooLargeMessage: string;
  },
): Promise<ParsedFile | null> {
  const contentType = req.headers["content-type"];
  if (!contentType || !contentType.startsWith("multipart/form-data")) {
    throw new HttpError(415, "Se esperaba multipart/form-data");
  }

  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new HttpError(400, "Cabeceras multipart/form-data inválidas");
  }

  const boundary = boundaryMatch[1];
  const bodyBuffer = await readRequestBuffer(req, maxSize + 512 * 1024, tooLargeMessage);
  const file = parseMultipartFile(bodyBuffer, boundary, field);

  if (!file) {
    return null;
  }

  if (allowedMime && !allowedMime.test(file.mimeType)) {
    throw new HttpError(415, "Formato de archivo no soportado");
  }

  if (!file.buffer.length) {
    throw new HttpError(400, "El archivo está vacío");
  }

  if (file.buffer.length > maxSize) {
    throw new HttpError(413, tooLargeMessage);
  }

  return file;
}
