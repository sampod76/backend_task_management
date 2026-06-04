import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EntityType } from '../../../common/enums/file.enum';

export class ConfirmUploadDto {
  @IsString()
  fileKey: string;

  @IsString()
  filename: string;

  @IsString()
  path: string;

  @IsMimeType()
  mimetype: string;

  @IsInt()
  @Min(1)
  size: number;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
