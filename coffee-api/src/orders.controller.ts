import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { OrderEntity, OrderStatus, ProductEntity } from './entities'
import { StoreStatusService } from './store-status.service'

const METHODS = ['Tiền mặt', 'Chuyển khoản']
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

@Controller('orders')
export class OrdersController {
  constructor(
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    private readonly status: StoreStatusService,
  ) {}

  private async calcTotal(lines: { id: number; qty: number }[]) {
    if (!lines?.length) return 0
    const ps = await this.products.findBy({ id: In(lines.map((l) => l.id)) })
    return lines.reduce((s, l) => s + (ps.find((p) => p.id === l.id)?.price ?? 0) * l.qty, 0)
  }

  private async nextId() {
    const all = await this.orders.find({ select: ['id'] })
    const max = all.reduce((m, o) => Math.max(m, parseInt(o.id.replace(/\D/g, '')) || 0), 1000)
    return 'DH' + (max + 1)
  }

  @Get()
  findAll() {
    return this.orders.find({ order: { createdAt: 'DESC', id: 'DESC' } })
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const o = await this.orders.findOneBy({ id })
    if (!o) throw new NotFoundException('Không tìm thấy đơn')
    return o
  }

  // body: { table: 'Bàn 3', lines: [{id: 1, qty: 2}], staff: 'Minh Anh', customer?, phone?, note?, payMethod? }
  @Post()
  async create(
    @Body()
    body: {
      table: string
      lines: { id: number; qty: number }[]
      staff: string
      customer?: string
      phone?: string
      note?: string
      payMethod?: string
    },
  ) {
    // đơn do khách tự đặt trên web: quán đóng cửa thì không nhận
    if (body.staff === 'Khách đặt' && !this.status.isOpen()) {
      throw new BadRequestException('Quán đang đóng cửa, chưa nhận đơn')
    }

    const d = new Date()
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const order = this.orders.create({
      id: await this.nextId(),
      table: body.table,
      lines: body.lines,
      staff: body.staff,
      status: 'Chờ pha chế',
      time,
      total: await this.calcTotal(body.lines),
      customer: clean(body.customer, 100),
      phone: clean(body.phone, 20).replace(/\s/g, ''),
      note: clean(body.note, 500),
      payMethod: METHODS.includes(body.payMethod ?? '') ? (body.payMethod as string) : 'Tiền mặt',
      paid: false, // đơn mới luôn chưa thanh toán, nhân viên xác nhận sau
    })
    return this.orders.save(order)
  }

  // sửa đơn (bàn, món, nhân viên, thanh toán, lý do huỷ) - tự tính lại tổng tiền
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<OrderEntity>) {
    const o = await this.findOne(id)
    if (body.table !== undefined) o.table = body.table
    if (body.staff !== undefined) o.staff = body.staff
    if (body.lines !== undefined) {
      o.lines = body.lines
      o.total = await this.calcTotal(body.lines)
    }
    if (body.payMethod !== undefined && METHODS.includes(body.payMethod)) o.payMethod = body.payMethod
    if (body.paid !== undefined) o.paid = !!body.paid
    if (body.cancelReason !== undefined) o.cancelReason = clean(body.cancelReason, 255)
    return this.orders.save(o)
  }

  // đổi trạng thái: body { status: 'Đang pha' } ; khi Hoàn thành sẽ cộng số lượng đã bán
  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body() body: { status: OrderStatus }) {
    const o = await this.findOne(id)
    if (body.status === 'Hoàn thành' && o.status !== 'Hoàn thành') {
      for (const l of o.lines) await this.products.increment({ id: l.id }, 'sold', l.qty)
    }
    o.status = body.status
    return this.orders.save(o)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.findOne(id)
    await this.orders.delete(id)
    return { deleted: true }
  }
}
