import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OffsetPagination } from '../../common/pagination/pagination.types';
import { Prisma } from '../../generated/prisma/client';

const userSelect = {
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
  admin: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput) {
    return this.prisma.client.user.create({
      data,
      select: userSelect,
    });
  }

  async findAll(where: Prisma.UserWhereInput, pagination: OffsetPagination) {
    const [total, items] = await this.prisma.client.$transaction([
      this.prisma.client.user.count({ where }),
      this.prisma.client.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: {
          [pagination.sortBy]: pagination.sortOrder,
        },
        select: userSelect,
      }),
    ]);

    return { total, items };
  }

  findUnique(id: string) {
    return this.prisma.client.user.findFirst({
      where: { id },
      select: userSelect,
    });
  }

  findByEmail(email: string) {
    return this.prisma.client.user.findFirst({
      where: { email },
    });
  }

  findByUsername(username: string) {
    return this.prisma.client.user.findFirst({
      where: { username },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.client.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  remove(id: string) {
    return this.prisma.client.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      select: userSelect,
    });
  }
}
