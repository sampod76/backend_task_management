import { Injectable } from '@nestjs/common';
import { OffsetPagination } from '../../common/pagination/pagination.types';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';

const adminSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      accountType: true,
      status: true,
      isEmailVerified: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.AdminSelect;

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AdminCreateInput) {
    return this.prisma.client.admin.create({
      data,
      select: adminSelect,
    });
  }

  async findAll(where: Prisma.AdminWhereInput, pagination: OffsetPagination) {
    const [total, items] = await this.prisma.client.$transaction([
      this.prisma.client.admin.count({ where }),
      this.prisma.client.admin.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy]: pagination.sortOrder,
        },
        select: adminSelect,
      }),
    ]);

    return { total, items };
  }

  findUnique(id: string) {
    return this.prisma.client.admin.findFirst({
      where: { id },
      select: adminSelect,
    });
  }

  findByUserId(userId: string) {
    return this.prisma.client.admin.findFirst({
      where: { userId },
      select: adminSelect,
    });
  }

  update(id: string, data: Prisma.AdminUpdateInput) {
    return this.prisma.client.admin.update({
      where: { id },
      data,
      select: adminSelect,
    });
  }

  remove(id: string) {
    return this.prisma.client.admin.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      select: adminSelect,
    });
  }
}
