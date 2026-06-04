import { FileCategory } from '../enums/file.enum';

export function detectFileCategory(mimetype: string): FileCategory {
  if (mimetype.startsWith('image/')) return FileCategory.image;
  if (mimetype.startsWith('video/')) return FileCategory.video;
  if (mimetype.startsWith('audio/')) return FileCategory.audio;
  if (mimetype === 'application/pdf') return FileCategory.pdf;

  if (
    mimetype.includes('word') ||
    mimetype.includes('excel') ||
    mimetype.includes('powerpoint') ||
    mimetype.includes('text') ||
    mimetype.includes('application/')
  ) {
    return FileCategory.document;
  }

  return FileCategory.other;
}
