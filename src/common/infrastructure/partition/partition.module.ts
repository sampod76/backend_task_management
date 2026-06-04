import { Global, Module } from '@nestjs/common';

import { PartitionBootstrapService } from './partition-bootstrap.service';

@Global()
@Module({
  providers: [PartitionBootstrapService],
  exports: [PartitionBootstrapService],
})
export class PartitionModule {}
