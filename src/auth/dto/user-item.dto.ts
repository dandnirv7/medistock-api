import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Admin Apotek' })
  name!: string;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ nullable: true, example: 'admin@medistock.local' })
  email!: string | null;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
