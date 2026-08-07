import { S3Client } from "@aws-sdk/client-s3";
import config from "config";

export function trimmedOrEmpty(value: string | undefined): string {
  return value?.trim() ?? "";
}

const s3cfg = config.get<AppConfig["s3"]>("s3");
const conn = s3cfg.connection;

/**
 * Empty string in config means "use AWS default endpoint" (real S3).
 * Non-empty values are used for LocalStack or custom endpoints.
 */
function resolveEndpoint(): string | undefined {
  const fromConfig = trimmedOrEmpty(conn.endpoint);
  return fromConfig || undefined;
}

export const avatarS3Bucket = trimmedOrEmpty(s3cfg.bucket) || "platyko-avatars";
export const avatarS3Region = trimmedOrEmpty(conn.region) || "us-east-1";
export const avatarS3Endpoint = resolveEndpoint();
const usePathStyle =
  typeof conn.forcePathStyle === "boolean" ? conn.forcePathStyle : Boolean(avatarS3Endpoint);

const accessKeyId =
  trimmedOrEmpty(conn.credentials?.accessKeyId) || (avatarS3Endpoint ? "test" : undefined);
const secretAccessKey =
  trimmedOrEmpty(conn.credentials?.secretAccessKey) || (avatarS3Endpoint ? "test" : undefined);

export const s3Client = new S3Client({
  region: avatarS3Region,
  endpoint: avatarS3Endpoint,
  forcePathStyle: usePathStyle,
  credentials: accessKeyId && secretAccessKey
    ? {
        accessKeyId,
        secretAccessKey,
      }
    : undefined,
});
