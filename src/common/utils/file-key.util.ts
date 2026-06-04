import crypto from 'crypto';

type GenerateFileKeyPayload = {
  filename: string;
  size: number;
  userId?: string | null;
};

/**
 * Generates a non-reversible key used in file paths.
 *
 * Runtime note:
 * Date.now() is part of the hash, so the same file metadata can produce
 * different keys across uploads.
 *
 * @see src/common/utils/file-path.util.ts
 */
export function generateFileKey(payload: GenerateFileKeyPayload): string {
  const timestamp = Date.now();
  const raw = `${payload.filename}-${payload.size}-${payload.userId ?? 'anonymous'}-${timestamp}`;

  return crypto.createHash('sha256').update(raw).digest('hex');
}
