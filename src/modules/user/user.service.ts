import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors';
import bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client';
import {
  buildOffsetMeta,
  buildOffsetPagination,
} from '../../common/pagination/offset-pagination';
import { PrismaService } from '../../database/prisma.service';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './schemas/create.schema';
import { UpdateUserDto } from './schemas/update.schema';
import { UserQueryFilterDto } from './schemas/query-filter.schema';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  async create(dto: CreateUserDto) {
    await this.ensureUniqueEmail(dto.email);
    await this.ensureUniqueUsername(dto.username);

    const data = await this.mapCreateUserDto(dto);

    if (dto.role === 'admin' && dto.admin) {
      return this.prisma.client.$transaction(async (tx) => {
        return tx.user.create({
          data,
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
            admin: true,
          },
        });
      });
    }

    return this.userRepository.create(data);
  }

  async findAll(query: UserQueryFilterDto) {
    const pagination = buildOffsetPagination(query, [
      'createdAt',
      'email',
      'username',
      'role',
      'status',
    ]);
    const where = this.buildWhereFilter(query);
    const { total, items } = await this.userRepository.findAll(
      where,
      pagination,
    );

    return {
      meta: buildOffsetMeta(total, pagination.page, pagination.limit),
      items,
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findUnique(id);

    if (!user) {
      throw AppException.notFound('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      await this.ensureUniqueEmail(dto.email, id);
    }

    if (dto.username) {
      await this.ensureUniqueUsername(dto.username, id);
    }

    const data = await this.mapUpdateUserDto(dto);

    return this.userRepository.update(id, data);
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.userRepository.remove(id);
  }

  async createUser(dto: CreateUserDto) {
    return this.create(dto);
  }

  async users() {
    const result = await this.findAll({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return result.items;
  }

  async user(id: string) {
    return this.findOne(id);
  }

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    return this.update(id, dto);
  }

  private async mapCreateUserDto(
    dto: CreateUserDto,
  ): Promise<Prisma.UserCreateInput> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return {
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
      role: dto.role,
      accountType: dto.accountType,
      status: dto.status,
      isEmailVerified: dto.isEmailVerified,
      ...(dto.role === 'admin' && dto.admin
        ? {
            admin: {
              create: {
                firstName: dto.admin.firstName,
                lastName: dto.admin.lastName,
                phone: dto.admin.phone,
                address: dto.admin.address,
              },
            },
          }
        : {}),
    };
  }

  private async mapUpdateUserDto(
    dto: UpdateUserDto,
  ): Promise<Prisma.UserUpdateInput> {
    return {
      ...(dto.email ? { email: dto.email } : {}),
      ...(dto.username ? { username: dto.username } : {}),
      ...(dto.password
        ? { password: await bcrypt.hash(dto.password, 12) }
        : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.accountType ? { accountType: dto.accountType } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.isEmailVerified !== undefined
        ? { isEmailVerified: dto.isEmailVerified }
        : {}),
      ...(dto.admin
        ? {
            admin: {
              update: {
                ...(dto.admin.firstName
                  ? { firstName: dto.admin.firstName }
                  : {}),
                ...(dto.admin.lastName ? { lastName: dto.admin.lastName } : {}),
                ...(dto.admin.phone !== undefined
                  ? { phone: dto.admin.phone }
                  : {}),
                ...(dto.admin.address !== undefined
                  ? { address: dto.admin.address }
                  : {}),
              },
            },
          }
        : {}),
    };
  }

  private buildWhereFilter(query: UserQueryFilterDto): Prisma.UserWhereInput {
    return {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { username: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.email
        ? { email: { contains: query.email, mode: 'insensitive' } }
        : {}),
      ...(query.username
        ? { username: { contains: query.username, mode: 'insensitive' } }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.accountType ? { accountType: query.accountType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isEmailVerified !== undefined
        ? { isEmailVerified: query.isEmailVerified }
        : {}),
    };
  }

  private async ensureUniqueEmail(email: string, excludeId?: string) {
    const user = await this.userRepository.findByEmail(email);

    if (user && user.id !== excludeId) {
      throw AppException.conflict('Email already exists');
    }
  }

  private async ensureUniqueUsername(username: string, excludeId?: string) {
    const user = await this.userRepository.findByUsername(username);

    if (user && user.id !== excludeId) {
      throw AppException.conflict('Username already exists');
    }
  }
}
