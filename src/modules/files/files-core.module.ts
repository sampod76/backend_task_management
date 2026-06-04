import { Module } from '@nestjs/common';
import { AwsS3Util } from '../../common/utils/aws-s3.util';
import { FilesRepository } from './files.repository';
import { AwsStorageService } from './storage/aws-storage.service';

@Module({
  providers: [FilesRepository, AwsStorageService, AwsS3Util],
  exports: [FilesRepository, AwsStorageService],
})
export class FilesCoreModule {}
