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
export class NotificationLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: PrismaTx) {
    return tx ? tx.notificationLog : this.prisma.client.notificationLog;
  }

  create(args: Prisma.NotificationLogCreateArgs, tx?: PrismaTx) {
    return this.getClient(tx).create(args);
  }

  findById(
    id: string,
    serviceName: ServiceName,
    args?: Omit<Prisma.NotificationLogFindUniqueArgs, 'where'>,
    tx?: PrismaTx,
  ) {
    return this.getClient(tx).findUnique({
      ...args,
      where: {
        id_serviceName: { id, serviceName },
        deletedAt: null,
      },
    });
  }

  findOne(args: Prisma.NotificationLogFindUniqueArgs, tx?: PrismaTx) {
    return this.getClient(tx).findFirst({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  findMany(
    args: Prisma.NotificationLogFindManyArgs,
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

  count(args?: Prisma.NotificationLogCountArgs, tx?: PrismaTx) {
    return this.getClient(tx).count({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  update(args: Prisma.NotificationLogUpdateArgs, tx?: PrismaTx) {
    return this.getClient(tx).update(args);
  }

  updateMany(args: Prisma.NotificationLogUpdateManyArgs, tx?: PrismaTx) {
    return this.getClient(tx).updateMany({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  softDelete(id: string, serviceName: ServiceName, tx?: PrismaTx) {
    return this.getClient(tx).update({
      where: {
        id_serviceName: { id, serviceName },
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
