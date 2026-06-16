import { ApiProperty } from '@nestjs/swagger';

/**
 * Generic pagination envelope returned by every list endpoint. We
 * expose the meta fields individually so the schema is concrete
 * (Swagger can't model a generic class without a concrete type
 * argument; controllers apply it via `PageDto<ItemDto>`).
 */
export class PageMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class PageDto<T> {
  @ApiProperty({ type: () => Array, isArray: true })
  data!: T[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
