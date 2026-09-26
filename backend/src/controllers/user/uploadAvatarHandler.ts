/**
 * PUT /api/user/avatar/upload — accepts raw JPEG bytes, uploads them to S3 server-side, returns { publicUrl }.
 *
 * Responsibility: validate the bytes are really a JPEG (the Content-Type header is client-controlled),
 * store them under a random key owned by the caller, hand back the URL the client then PATCHes.
 * Layer: backend user HTTP handlers
 * Depends on: crypto, storage helpers, logger
 * Consumers: user router (raw body parser + dedicated rate limit)
 */

import { randomUUID } from "crypto";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { getAvatarPublicUrl, isJpegBuffer, putAvatarObject, rewriteLocalS3UrlForClient } from "../../utils/storage.js";
import { logError, logInfo } from "../../utils/logger.js";

export async function putAvatarDirectUpload(req: AuthenticatedRequest, res: Response) {
  const body = req.body as Buffer;

  if (!Buffer.isBuffer(body) || body.length === 0) {
    return res.status(400).json({ error: "Empty or invalid image body" });
  }
  if (!isJpegBuffer(body)) {
    return res.status(415).json({ error: "Avatar must be a JPEG image" });
  }
  const key = `avatars/${req.user!.userId}/${randomUUID()}.jpg`;

  try {
    await putAvatarObject(key, body, "image/jpeg");
    const publicUrl = rewriteLocalS3UrlForClient(getAvatarPublicUrl(key), req.hostname);
    logInfo("[USER]", "avatar:upload-ok", { userId: req.user?.userId, bytes: body.length });

    return res.json({ publicUrl });
  } catch (error) {
    logError("[USER]", error, { phase: "avatar-direct-upload", userId: req.user?.userId });

    return res.status(500).json({ error: "Upload failed" });
  }
}
