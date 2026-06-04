export interface IStorageService {
  generateUploadUrl(params: {
    key: string;
    mimetype: string;
    isPublic?: boolean;
  }): Promise<{
    uploadUrl: string;
    path: string;
    url: string;
  }>;

  getPrivateUrl(key: string): Promise<string>;

  verifyFileExists(key: string): Promise<boolean>;

  deleteFile(key: string): Promise<void>;
}
