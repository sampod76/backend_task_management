import { Injectable } from '@nestjs/common';

import { FilesRepository } from './files.repository';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { FileQueryDto } from './dto/file-query.dto';
import { AppException } from '../../common/errors';
import { detectFileCategory } from '../../common/utils/file-category.util';
import { generateFileKey } from '../../common/utils/file-key.util';
import { generateFilePath } from '../../common/utils/file-path.util';
import { validateFileSize } from '../../common/utils/file-size.util';
import { StorageProvider } from '../../common/enums/file.enum';
import { FileQueueProducer } from './queue/file-queue.producer';
import { AwsStorageService } from './storage/aws-storage.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly awsStorageService: AwsStorageService,
    private readonly filesRepository: FilesRepository,
    private readonly fileQueueProducer: FileQueueProducer,
  ) {}

  async createUploadUrl(dto: CreateUploadUrlDto, userId?: string) {
    const files = await Promise.all(
      dto.files.map(async (file) => {
        const category = detectFileCategory(file.mimetype);

        validateFileSize(category, file.size);

        const fileKey = generateFileKey({
          filename: file.filename,
          size: file.size,
          userId,
        });

        const isPublic = file.isPublic ?? true;

        const path = generateFilePath({
          filename: file.filename,
          category,
          fileKey,
          isPublic,
        });

        const uploadData = await this.awsStorageService.generateUploadUrl({
          key: path,
          mimetype: file.mimetype,
          isPublic,
        });

        return {
          fileKey,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          category,
          isPublic,
          path: uploadData.path,
          url: uploadData.url,
          uploadUrl: uploadData.uploadUrl,
        };
      }),
    );

    return { files };
  }

  async confirmUpload(dto: ConfirmUploadDto, _userId?: string) {
    const existing = await this.filesRepository.findByFileKey(dto.fileKey);

    if (existing) {
      throw AppException.conflict('File already confirmed');
    }

    const existsInS3 = await this.awsStorageService.verifyFileExists(dto.path);

    if (!existsInS3) {
      throw AppException.badRequest('File was not uploaded to S3');
    }

    const category = detectFileCategory(dto.mimetype);

    validateFileSize(category, dto.size);

    if (dto.isPrimary && dto.entityId && dto.entityType) {
      await this.filesRepository.unsetPrimary(dto.entityId, dto.entityType);
    }

    const file = await this.filesRepository.create({
      filename: dto.filename,
      mimetype: dto.mimetype,
      size: dto.size,
      storage: StorageProvider.aws,
      path: dto.path,
      url:
        dto.isPublic === false
          ? null
          : this.awsStorageService.getPublicUrl(dto.path),
      fileKey: dto.fileKey,
      category,
      entityId: dto.entityId,
      entityType: dto.entityType,
      // createdById: userId,
      isPrimary: dto.isPrimary ?? false,
      isPublic: dto.isPublic ?? true,
      metadata: dto.metadata
        ? JSON.parse(JSON.stringify(dto.metadata))
        : undefined,
    });

    await this.fileQueueProducer.addProcessUploadedFileJob({
      fileId: file.id,
      path: file.path,
      mimetype: file.mimetype,
    });

    return file;
  }

  async getPrivateFileUrl(fileKey: string) {
    const file = await this.filesRepository.findByFileKey(fileKey);

    if (!file || file.deletedAt) {
      throw AppException.notFound('File not found');
    }

    if (file.isPublic) {
      return {
        url: file.url,
        isPublic: true,
      };
    }

    const signedUrl = await this.awsStorageService.getPrivateUrl(file.path);

    return {
      url: signedUrl,
      isPublic: false,
    };
  }

  async listFiles(query: FileQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.createdById ? { createdById: query.createdById } : {}),
    };

    const data = await this.filesRepository.findMany({
      page,
      limit,
      where,
    });

    return {
      meta: {
        page,
        limit,
        count: data.total,
      },
      data,
    };
  }

  async deleteFile(id: string) {
    const file = await this.filesRepository.findById(id);

    if (!file) {
      throw AppException.notFound('File not found');
    }

    const deleted = await this.filesRepository.softDelete(id);

    await this.fileQueueProducer.addDeleteS3FileJob({
      path: file.path,
    });

    return deleted;
  }
}
