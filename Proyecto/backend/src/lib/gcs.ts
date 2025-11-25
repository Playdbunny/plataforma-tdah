import { Storage } from "@google-cloud/storage";
import path from "path";

const projectId = process.env.GCP_PROJECT_ID;
const bucketName = process.env.GCS_BUCKET_NAME;

const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const base64Json = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

const resolveCredentials = (): { keyFilename?: string; credentials?: object } => {
  if (base64Json || rawJson) {
    const decoded = base64Json
      ? Buffer.from(base64Json, "base64").toString("utf-8")
      : (rawJson as string);

    return { credentials: JSON.parse(decoded) };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      keyFilename: path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    };
  }

  return {};
};

const storage = new Storage({
  projectId,
  ...resolveCredentials(),
});

if (!bucketName) {
  throw new Error("GCS_BUCKET_NAME must be defined in environment variables");
}

export const bucket = storage.bucket(bucketName);