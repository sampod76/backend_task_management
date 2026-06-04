import { FILE_SIZE_LIMIT } from '../constants/file.constant';
import { AppException } from '../errors';
import { FileCategory } from '../enums/file.enum';

export function validateFileSize(category: FileCategory, size: number): void {
  const maxSize = FILE_SIZE_LIMIT[category];

  if (size > maxSize) {
    throw AppException.badRequest(
      `File size too large. Max allowed size for ${category} is ${Math.round(
        maxSize / 1024 / 1024,
      )}MB`,
    );
  }
}
