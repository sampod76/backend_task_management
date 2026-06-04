import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  buildOffsetMeta,
  buildOffsetPagination,
} from '../../common/pagination/offset-pagination';
import { AppException } from '../../common/errors';
import { AdminRepository } from './admin.repository';
import { CreateAdminDto } from './schemas/create.schema';
import { UpdateAdminDto } from './schemas/update.schema';
import { AdminQueryFilterDto } from './schemas/query-filter.schema';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async create(dto: CreateAdminDto) {
    const existing = await this.adminRepository.findByUserId(dto.userId);

    if (existing) {
      throw AppException.conflict('Admin profile already exists');
    }

    const data = this.mapCreateAdminDto(dto);

    return this.adminRepository.create(data);
  }

  async findAll(query: AdminQueryFilterDto) {
    const pagination = buildOffsetPagination(query, [
      'createdAt',
      'firstName',
      'lastName',
    ]);
    const where = this.buildWhereFilter(query);
    const { total, items } = await this.adminRepository.findAll(
      where,
      pagination,
    );

    return {
      meta: buildOffsetMeta(total, pagination.page, pagination.limit),
      items,
    };
  }

  async findOne(id: string) {
    const admin = await this.adminRepository.findUnique(id);

    if (!admin) {
      throw AppException.notFound('Admin profile not found');
    }

    return admin;
  }

  async update(id: string, dto: UpdateAdminDto) {
    await this.findOne(id);

    const data = this.mapUpdateAdminDto(dto);

    return this.adminRepository.update(id, data);
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.adminRepository.remove(id);
  }

  private mapCreateAdminDto(dto: CreateAdminDto): Prisma.AdminCreateInput {
    return {
      user: {
        connect: {
          id: dto.userId,
        },
      },
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      address: dto.address,
    };
  }

  private mapUpdateAdminDto(dto: UpdateAdminDto): Prisma.AdminUpdateInput {
    return {
      ...(dto.firstName ? { firstName: dto.firstName } : {}),
      ...(dto.lastName ? { lastName: dto.lastName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
    };
  }

  private buildWhereFilter(query: AdminQueryFilterDto): Prisma.AdminWhereInput {
    return {
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.phone
        ? { phone: { contains: query.phone, mode: 'insensitive' } }
        : {}),
    };
  }
}
