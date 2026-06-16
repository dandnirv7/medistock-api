import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

export interface SupplierItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  medicineCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: SupplierQueryDto): Promise<{
    data: SupplierItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(typeof query.isActive === 'boolean'
        ? { isActive: query.isActive }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { medicines: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: rows.map((s) => this.toItem(s)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string): Promise<SupplierItem> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { medicines: true } } },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return this.toItem(supplier);
  }

  async create(dto: CreateSupplierDto): Promise<SupplierItem> {
    const created = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
        isActive: true,
      },
      include: { _count: { select: { medicines: true } } },
    });
    return this.toItem(created);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierItem> {
    await this.findOne(id);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { _count: { select: { medicines: true } } },
    });
    return this.toItem(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private toItem(
    s: Prisma.SupplierGetPayload<{
      include: { _count: { select: { medicines: true } } };
    }>,
  ): SupplierItem {
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      notes: s.notes,
      isActive: s.isActive,
      medicineCount: s._count.medicines,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
