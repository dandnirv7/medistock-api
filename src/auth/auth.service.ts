import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../database/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    role: 'ADMIN' | 'STAFF';
  };
}

export interface PaginatedUsers {
  data: Array<Omit<User, 'password'>>;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async me(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  // ---------------------------------------------------------------------------
  // Admin: user CRUD
  // ---------------------------------------------------------------------------

  async listUsers(query: UserQueryDto): Promise<PaginatedUsers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { username: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: data.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ password, ...rest }) => rest,
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findUser(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user;
    return rest;
  }

  async createUser(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      const hashed = await bcrypt.hash(dto.password, 10);
      const created = await this.prisma.user.create({
        data: {
          name: dto.name,
          username: dto.username,
          email: dto.email ?? null,
          password: hashed,
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = created;
      return rest;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Username sudah digunakan');
      }
      throw err;
    }
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = updated;
      return rest;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Username sudah digunakan');
      }
      throw err;
    }
  }

  async deleteUser(id: string, actorId: string): Promise<null> {
    if (id === actorId) {
      throw new BadRequestException(
        'Admin tidak dapat menonaktifkan akunnya sendiri',
      );
    }
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User tidak ditemukan');
    }
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return null;
  }

  // ---------------------------------------------------------------------------
  // Self-service: profile + password
  // ---------------------------------------------------------------------------

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User tidak ditemukan');
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = updated;
    return rest;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    const valid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Password lama salah');
    }
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    return null;
  }

  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
  ): Promise<{ newPassword: string }> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User tidak ditemukan');
    }
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
    return { newPassword: dto.newPassword };
  }
}
