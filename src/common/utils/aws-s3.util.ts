import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/app.config';
import {
  SIGNED_PRIVATE_URL_EXPIRES_IN,
  SIGNED_UPLOAD_URL_EXPIRES_IN,
} from '../constants/file.constant';

@Injectable()
export class AwsS3Util {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cloudfrontUrl: string;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const awsConfig = this.configService.getOrThrow('app.storage.aws', {
      infer: true,
    });

    this.bucket = awsConfig.bucket;
    this.cloudfrontUrl = awsConfig.cloudfrontUrl;

    this.s3 = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });
  }

  getCdnUrl(path: string): string {
    return `${this.cloudfrontUrl.replace(/\/$/, '')}/${path}`;
  }

  async generateUploadUrl(params: {
    path: string;
    mimetype: string;
    isPublic: boolean;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.path,
      ContentType: params.mimetype,
      CacheControl: params.isPublic
        ? 'public, max-age=31536000, immutable'
        : 'private, no-store',
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: SIGNED_UPLOAD_URL_EXPIRES_IN,
    });
  }

  async generatePrivateDownloadUrl(path: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: SIGNED_PRIVATE_URL_EXPIRES_IN,
    });
  }

  async verifyFileExists(path: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: path,
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(path: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: path,
      }),
    );
  }

  async listFilesFromS3(params: {
    prefix?: string;
    limit?: number;
    continuationToken?: string;
  }) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: params.prefix,
      MaxKeys: params.limit ?? 20,
      ContinuationToken: params.continuationToken,
    });

    return this.s3.send(command);
  }
}
