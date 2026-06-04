import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import { AwsS3Util } from '../../../common/utils/aws-s3.util';

@Injectable()
export class AwsStorageService implements IStorageService {
  constructor(private readonly s3Util: AwsS3Util) {}

  async generateUploadUrl(params: {
    key: string;
    mimetype: string;
    isPublic?: boolean;
  }) {
    const { key, mimetype, isPublic = true } = params;

    const uploadUrl = await this.s3Util.generateUploadUrl({
      path: key,
      mimetype,
      isPublic,
    });

    return {
      uploadUrl,
      path: key,
      url: isPublic ? this.s3Util.getCdnUrl(key) : '',
    };
  }

  async getPrivateUrl(key: string) {
    return this.s3Util.generatePrivateDownloadUrl(key);
  }

  async verifyFileExists(key: string) {
    return this.s3Util.verifyFileExists(key);
  }

  async deleteFile(key: string) {
    return this.s3Util.deleteFile(key);
  }

  getPublicUrl(key: string) {
    return this.s3Util.getCdnUrl(key);
  }
}
