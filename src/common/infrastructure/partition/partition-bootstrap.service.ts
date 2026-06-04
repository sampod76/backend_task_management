import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

import { PARTITION_SERVICES, PARTITION_TABLES } from './partition.constants';

@Injectable()
export class PartitionBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PartitionBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      this.logger.log('Starting partition bootstrap...');

      const result = await this.createPartitions();

      this.logger.log(
        `Partition bootstrap completed | Created: ${result.created} | Existing: ${result.existing}`,
      );

      if (result.createdPartitions.length > 0) {
        this.logger.log(
          `Created partitions:\n${result.createdPartitions.join('\n')}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to bootstrap partitions',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  private async createPartitions(): Promise<{
    created: number;
    existing: number;
    createdPartitions: string[];
  }> {
    const createdPartitions: string[] = [];

    let created = 0;
    let existing = 0;

    for (const parentTable of PARTITION_TABLES) {
      const [schemaName, baseTableName] = parentTable.split('.');

      for (const serviceName of PARTITION_SERVICES) {
        const partitionTableName = `${baseTableName}_${serviceName.toLowerCase()}`;

        const fullPartitionName = `${schemaName}.${partitionTableName}`;

        const partitionExists = await this.prisma.client.$queryRawUnsafe<
          Array<{ exists: boolean }>
        >(`
SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE c.relname = '${partitionTableName}'
      AND n.nspname = '${schemaName}'
) as "exists";
`);

        if (partitionExists[0]?.exists) {
          existing++;

          continue;
        }

        await this.prisma.client.$executeRawUnsafe(`
CREATE TABLE ${fullPartitionName}
PARTITION OF ${parentTable}
FOR VALUES IN ('${serviceName}');
`);

        created++;

        createdPartitions.push(fullPartitionName);

        this.logger.log(`Created partition: ${fullPartitionName}`);
      }
    }

    return {
      created,
      existing,
      createdPartitions,
    };
  }
}
