import { randomUUID } from "node:crypto";

export interface InlineImage {
  contentId: string;
  filename: string;
  data: Buffer;
}

export interface RawEmailFields {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  inlineImages: InlineImage[];
}

const CRLF = "\r\n";

/** Base64-encodes content and wraps lines at 76 chars as required by RFC 2045. */
function wrapBase64(content: Buffer | string): string {
  const base64 = (typeof content === "string" ? Buffer.from(content, "utf-8") : content).toString("base64");
  return base64.replace(/(.{76})/g, `$1${CRLF}`);
}

function textPart(mimeType: string, content: string): string {
  return [
    `Content-Type: ${mimeType}; charset=UTF-8`,
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(content),
  ].join(CRLF);
}

function imagePart(image: InlineImage): string {
  return [
    `Content-Type: image/png; name="${image.filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-ID: <${image.contentId}>`,
    `Content-Disposition: inline; filename="${image.filename}"`,
    "",
    wrapBase64(image.data),
  ].join(CRLF);
}

/**
 * Builds a raw RFC 5322 message for SES SendRawEmailCommand:
 * multipart/related wrapping a text+html multipart/alternative,
 * followed by the inline CID-referenced images.
 */
export function buildRawEmail(fields: RawEmailFields): Buffer {
  const related = `related-${randomUUID()}`;
  const alternative = `alternative-${randomUUID()}`;
  const lines = [
    `From: ${fields.from}`,
    `To: ${fields.to}`,
    `Subject: ${fields.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${related}"`,
    "",
    `--${related}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    "",
    `--${alternative}`,
    textPart("text/plain", fields.text),
    `--${alternative}`,
    textPart("text/html", fields.html),
    `--${alternative}--`,
    ...fields.inlineImages.flatMap((image) => [`--${related}`, imagePart(image)]),
    `--${related}--`,
    "",
  ];
  return Buffer.from(lines.join(CRLF), "utf-8");
}
