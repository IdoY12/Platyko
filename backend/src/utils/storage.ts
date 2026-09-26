import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { avatarS3Bucket, avatarS3Endpoint, avatarS3Region, s3Client } from "../aws/s3Client.js";

/**
 * In local dev the S3 endpoint resolves to localhost, which devices on the LAN cannot
 * reach. Replace localhost:<port> with <clientHostname>:<port> so the device can both
 * complete the PUT and later load the stored image URL.
 * This is a no-op in production (avatarS3Endpoint is empty for real AWS S3).
 */
export function rewriteLocalS3UrlForClient(url: string, clientHostname: string): string {
  if (!avatarS3Endpoint) return url;
  const endpointUrl = new URL(avatarS3Endpoint);

  if (endpointUrl.hostname !== "localhost") return url;

  return url.replace(`localhost:${endpointUrl.port}`, `${clientHostname}:${endpointUrl.port}`);
}

/** JPEG files start with the SOI marker FF D8 FF; the client-sent Content-Type is never trusted. */
export function isJpegBuffer(bytes: Buffer): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function getAvatarPublicUrl(key: string): string {
  if (avatarS3Endpoint) {
    return `${avatarS3Endpoint}/${avatarS3Bucket}/${key}`;
  }

  return `https://${avatarS3Bucket}.s3.${avatarS3Region}.amazonaws.com/${key}`;
}

export function extractAvatarKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (avatarS3Endpoint) {
      // In local/dev mode the presigned URL host may be a LAN IP rather than "localhost"
      // (rewritten in getAvatarPresignedUrlHandler so devices can reach LocalStack).
      // Validate by bucket path prefix only — do not enforce an exact hostname match.
      const path = parsed.pathname.replace(/^\/+/, "");
      const prefix = `${avatarS3Bucket}/`;

      if (!path.startsWith(prefix)) return null;

      return path.slice(prefix.length);
    }

    const virtualHost = `${avatarS3Bucket}.s3.${avatarS3Region}.amazonaws.com`;

    if (parsed.host === virtualHost) {
      return parsed.pathname.replace(/^\/+/, "") || null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function deleteAvatarObject(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: avatarS3Bucket,
      Key: key,
    }),
  );
}

/** Upload raw bytes directly from the server to S3 — no presigned URL required. */
export async function putAvatarObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: avatarS3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
