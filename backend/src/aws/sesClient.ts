import { SESClient } from "@aws-sdk/client-ses";
import config from "config";
import { trimmedOrEmpty } from "./s3Client.js";

const sesCfg = config.get<AppConfig["ses"]>("ses");
const conn = sesCfg.connection;

/**
 * Empty string in config means "use the real AWS SES endpoint".
 * Non-empty values are used for LocalStack or custom endpoints.
 */
const sesEndpoint = trimmedOrEmpty(conn.endpoint) || undefined;

const accessKeyId = trimmedOrEmpty(conn.credentials?.accessKeyId) || (sesEndpoint ? "test" : undefined);
const secretAccessKey = trimmedOrEmpty(conn.credentials?.secretAccessKey) || (sesEndpoint ? "test" : undefined);

export const sesFromEmail = trimmedOrEmpty(sesCfg.fromEmail) || "CodeQuest JS <noreply@codequestjs.com>";

export const sesClient = new SESClient({
  region: trimmedOrEmpty(conn.region) || "us-east-1",
  endpoint: sesEndpoint,
  credentials: accessKeyId && secretAccessKey
    ? {
        accessKeyId,
        secretAccessKey,
      }
    : undefined,
});
