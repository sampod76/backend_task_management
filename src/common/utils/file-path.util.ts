import path from 'path';
import { FileCategory } from '../enums/file.enum';

function slugifyFilename(filename: string): string {
  const ext = path.extname(filename);
  const name = filename.replace(ext, '');

  return (
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '') + ext.toLowerCase()
  );
}

/**
 * Builds the date partition segment used in object storage paths.
 *
 * Runtime note:
 * Uses server local time. If storage partitions must be globally stable, switch
 * this to UTC and update existing path expectations.
 */
function getDatePath(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

/**
 * Generates the canonical object storage path.
 *
 * Flow:
 * FilesService
 * -> generateFileKey()
 * -> generateFilePath()
 * -> storage provider upload/delete
 *
 * @see src/common/utils/file-key.util.ts
 */
export function generateFilePath(params: {
  filename: string;
  category: FileCategory;
  isPublic: boolean;
  fileKey: string;
}): string {
  const scope = params.isPublic ? 'public' : 'private';
  const datePath = getDatePath();
  const safeFilename = slugifyFilename(params.filename);

  return `${scope}/${params.category}/${datePath}/${params.fileKey}-${safeFilename}`;
}
