import { ApiProperty } from '@nestjs/swagger';

export class ErrorEnvelopeDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code?: string;
}

export class BadRequestResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Bad request' })
  message!: string;
}

export class UnauthorizedResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Unauthorized' })
  message!: string;
}

export class ForbiddenResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Forbidden' })
  message!: string;
}

export class NotFoundResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Resource not found' })
  message!: string;
}

export class ConflictResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Resource already exists' })
  message!: string;
}
