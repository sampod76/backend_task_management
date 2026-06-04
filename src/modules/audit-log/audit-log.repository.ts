import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { OffsetPagination } from '../../common/pagination/pagination.types';
import { ServiceName } from '../../common/constants/automation';

type PrismaTx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTx) {
    return tx ? tx.auditLog : this.prisma.client.auditLog;
  }

  // ✅ CREATE
  create(args: Prisma.AuditLogCreateArgs, tx?: PrismaTx) {
    return this.getClient(tx).create(args);
  }

  // ✅ FIND BY ID (SAFE + FLEXIBLE)
  findById(
    id: string,
    serviceName: ServiceName,
    args?: Omit<Prisma.AuditLogFindUniqueArgs, 'where'>,
    tx?: PrismaTx,
  ) {
    return this.getClient(tx).findUnique({
      ...args,
      where: {
        id_serviceName: { id: id, serviceName: serviceName },
      },
    });
  }
  findOne(args: Prisma.AuditLogFindUniqueArgs, tx?: PrismaTx) {
    return this.getClient(tx).findFirst({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  // ✅ FIND MANY
  findMany(
    args: Prisma.AuditLogFindManyArgs,
    pagination?: OffsetPagination,
    tx?: PrismaTx,
  ) {
    return this.getClient(tx).findMany({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
      ...(pagination && {
        skip: pagination.skip,
        take: pagination.limit,
      }),
      orderBy:
        args?.orderBy ||
        (pagination
          ? { [pagination.sortBy]: pagination.sortOrder }
          : undefined),
    });
  }

  // ✅ COUNT
  count(args?: Prisma.AuditLogCountArgs, tx?: PrismaTx) {
    return this.getClient(tx).count({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }
}
