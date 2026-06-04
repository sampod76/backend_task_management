import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EntityType } from '../../../common/enums/file.enum';

export class UploadUrlFileDto {
  @IsString()
  filename: string;

  @IsMimeType()
  mimetype: string;

  @IsInt()
  @Min(1)
  size: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;
}

export class CreateUploadUrlDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UploadUrlFileDto)
  files: UploadUrlFileDto[];
}
