import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class MedicineQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true'
      ? true
      : value === 'false'
        ? false
        : (value as boolean | undefined),
  )
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @IsIn(['soon', 'expired', 'safe'])
  expiredStatus?: 'soon' | 'expired' | 'safe';

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'code' | 'createdAt' | 'currentStock' | 'expiredDate' =
    'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  // Reference date for expiredStatus filtering (defaults to today at service layer).
  @IsOptional()
  @IsISO8601()
  now?: string;
}
