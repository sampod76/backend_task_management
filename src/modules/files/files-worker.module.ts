import { Module } from '@nestjs/common';
import { FilesCoreModule } from './files-core.module';
import { FileProcessorWorker } from './queue/file-processor.worker';
import { FileWorkerRunner } from './queue/file-worker.runner';

@Module({
  imports: [FilesCoreModule],
  providers: [FileProcessorWorker, FileWorkerRunner],
})
export class FilesWorkerModule {}
