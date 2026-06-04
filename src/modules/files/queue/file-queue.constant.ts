export const FILE_PROCESSING_QUEUE = 'file-processing';

export const FILE_QUEUE_JOBS = {
  PROCESS_UPLOADED_FILE: 'process-uploaded-file',
  DELETE_S3_FILE: 'delete-s3-file',
} as const;

export type FileQueueJob =
  (typeof FILE_QUEUE_JOBS)[keyof typeof FILE_QUEUE_JOBS];
