import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Put,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { readToken } from './auth.controller'
import { UserEntity } from './entities'
import { ShopMode, StoreStatusService } from './store-status.service'

@Controller('store-status')
export class StoreStatusController {
  constructor(
    private readonly status: StoreStatusService,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  ) {}

  // ai cũng xem được (khách, chưa đăng nhập)
  @Get()
  get() {
    return { mode: this.status.mode }
  }

  // chỉ chủ quán và nhân viên được đổi
  @Put()
  async set(@Headers('authorization') auth: string | undefined, @Body('mode') mode: ShopMode) {
    const id = readToken((auth ?? '').replace(/^Bearer\s+/i, ''))
    const user = id ? await this.users.findOneBy({ id }) : null
    if (!user) throw new UnauthorizedException('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại')
    if (user.role !== 'staff' && user.role !== 'owner') {
      throw new ForbiddenException('Chỉ chủ quán và nhân viên mới đổi được trạng thái cửa hàng')
    }
    if (!['auto', 'open', 'closed'].includes(mode)) throw new BadRequestException('Trạng thái không hợp lệ')
    this.status.set(mode)
    return { mode: this.status.mode }
  }
}