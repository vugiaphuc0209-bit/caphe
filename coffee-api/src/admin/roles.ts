import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { readToken } from '../auth.controller'
import { UserEntity } from '../entities'

export enum Role {
  USER = 'user',
  STAFF = 'staff', // nhân viên
  OWNER = 'owner', // chủ quán
}

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[]>('roles', [ctx.getHandler(), ctx.getClass()])
    if (!required || required.length === 0) return true

    const req = ctx.switchToHttp().getRequest()
    const token = String(req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '')
    const id = readToken(token)
    const user = id ? await this.users.findOneBy({ id }) : null
    if (!user) throw new UnauthorizedException('Chưa đăng nhập hoặc phiên đã hết hạn')
    if (!required.includes(user.role as Role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập mục này')
    }
    req.user = user
    return true
  }
}