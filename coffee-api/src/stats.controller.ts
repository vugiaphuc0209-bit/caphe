import { Controller, Get } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OrderEntity } from './entities'
import { month, week } from './seed'

@Controller('stats')
export class StatsController {
  constructor(@InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>) {}

  @Get()
  async get() {
    const done = await this.orders.findBy({ status: 'Hoàn thành' })
    return {
      revenueDone: done.reduce((s, o) => s + o.total, 0),
      ordersDone: done.length,
      ordersAll: await this.orders.count(),
      week, // doanh thu theo ngày (dữ liệu mẫu)
      month, // doanh thu theo tuần (dữ liệu mẫu)
    }
  }
}
