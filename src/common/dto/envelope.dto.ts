import { ApiProperty } from '@nestjs/swagger';

/**
 * The ResponseInterceptor wraps every controller return value in this
 * shape. Use it as the @ApiResponse `type` so Swagger shows the
 * real-world payload (the `data` slot is `T`).
 */
export class EnvelopeDto<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Success' })
  message!: string;

  @ApiProperty({ description: 'Echo of the controller return value' })
  data!: T;
}
