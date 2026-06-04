import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Create
  create(data: Prisma.FileCreateInput) {
    return this.prisma.client.file.create({ data });
  }

  // ✅ Find by ID (Service uses this)
  findById(id: string) {
    return this.prisma.client.file.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  // ✅ Find by fileKey
  findByFileKey(fileKey: string) {
    return this.prisma.client.file.findUnique({
      where: { fileKey },
    });
  }

  // ✅ List (MATCH SERVICE)
  async findMany(params: {
    page: number;
    limit: number;
    where: Prisma.FileWhereInput;
  }) {
    const skip = (params.page - 1) * params.limit;

    const [total, data] = await this.prisma.client.$transaction([
      this.prisma.client.file.count({
        where: {
          ...params.where,
          deletedAt: null,
        },
      }),

      this.prisma.client.file.findMany({
        where: {
          ...params.where,
          deletedAt: null,
        },
        skip,
        take: params.limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return { total, data };
  }

  // ✅ Update
  update(id: string, data: Prisma.FileUpdateInput) {
    return this.prisma.client.file.update({
      where: { id },
      data,
    });
  }

  // ✅ Soft delete (MATCH SERVICE)
  softDelete(id: string) {
    return this.prisma.client.file.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // ✅ Restore
  restore(id: string) {
    return this.prisma.client.file.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  /**
   * ⭐ Ensure only ONE primary file per entity
   */
  async unsetPrimary(entityId: string, entityType: string) {
    await this.prisma.client.file.updateMany({
      where: {
        entityId,
        entityType,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
  }
}
