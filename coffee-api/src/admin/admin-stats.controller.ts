import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PHONE, cleanPhone, hashPassword } from '../auth.controller'
import { In, MoreThanOrEqual, Not, Repository } from 'typeorm'
import { OrderEntity, ProductEntity, StaffEntity, StockEntity, TableEntity, UserEntity } from '../entities'
import { Role, Roles, RolesGuard } from './roles'

const DONE = 'Hoàn thành'
const CANCELLED = 'Đã huỷ'
const PENDING = ['Chờ pha chế', 'Đang pha']

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminStatsController {
  constructor(
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(StaffEntity) private readonly staff: Repository<StaffEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(TableEntity) private readonly tables: Repository<TableEntity>,
    @InjectRepository(StockEntity) private readonly stock: Repository<StockEntity>,
  ) {}

  private ordersSince(from: Date) {
    return this.orders.find({ where: { createdAt: MoreThanOrEqual(from) } })
  }

  private async topProducts(orders: OrderEntity[], limit = 5) {
    const qty = new Map<number, number>()
    for (const o of orders) for (const l of o.lines ?? []) qty.set(l.id, (qty.get(l.id) ?? 0) + l.qty)
    if (qty.size === 0) return []
    const names = new Map((await this.products.find()).map((p) => [p.id, p.name]))
    return [...qty.entries()]
      .map(([id, q]) => ({ name: names.get(id) ?? `Món #${id}`, qty: q }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit)
  }

  /** Nhân viên và chủ quán: tình hình hôm nay (không có số tiền, doanh thu chỉ dành cho chủ quán) */
  @Get('stats/today')
  @Roles(Role.STAFF, Role.OWNER)
  async today() {
    const today0 = startOfDay(new Date())
    const week = await this.ordersSince(addDays(today0, -6))
    const todayAll = week.filter((o) => o.createdAt >= today0)
    const valid = todayAll.filter((o) => o.status !== CANCELLED)
    const weekValid = week.filter((o) => o.status !== CANCELLED)

    const byStatus = (st: string) => todayAll.filter((o) => o.status === st).length
    const ordersByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: valid.filter((o) => o.createdAt.getHours() === h).length,
    }))
    const ordersByDay = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today0, i - 6)
      const next = addDays(d, 1)
      return { date: dayKey(d), orders: weekValid.filter((o) => o.createdAt >= d && o.createdAt < next).length }
    })

    const tables = await this.tables.find()
    const lowStock = (await this.stock.find())
      .filter((x) => x.qty <= x.min)
      .sort((a, b) => a.qty / Math.max(a.min, 1) - b.qty / Math.max(b.min, 1))
      .map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, min: x.min }))

    const pendingList = valid
      .filter((o) => PENDING.includes(o.status))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 8)
      .map((o) => ({
        id: o.id,
        table: o.table,
        time: o.time,
        status: o.status,
        items: (o.lines ?? []).reduce((n, l) => n + l.qty, 0),
      }))

    return {
      ordersToday: valid.length,
      pendingOrders: valid.filter((o) => PENDING.includes(o.status)).length,
      completedOrders: byStatus(DONE),
      statusToday: {
        waiting: byStatus('Chờ pha chế'),
        making: byStatus('Đang pha'),
        done: byStatus(DONE),
        cancelled: byStatus(CANCELLED),
      },
      ordersByHour,
      ordersByDay,
      tablesBusy: tables.filter((t) => t.status === 'Có khách').length,
      tablesTotal: tables.length,
      lowStock,
      pendingList,
      topProducts: await this.topProducts(valid),
      topProducts7Days: await this.topProducts(weekValid),
    }
  }

  /** Chỉ chủ quán: doanh thu, nhân viên */
  @Get('stats/revenue')
  @Roles(Role.OWNER)
  async revenue() {
    const today0 = startOfDay(new Date())
    const done = (await this.ordersSince(addDays(today0, -29))).filter((o) => o.status === DONE)

    const sum = (list: OrderEntity[]) => list.reduce((s, o) => s + Number(o.total), 0)
    const inRange = (from: Date) => done.filter((o) => o.createdAt >= from)

    const revenueByDay: { date: string; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today0, -i)
      const next = addDays(d, 1)
      revenueByDay.push({ date: dayKey(d), revenue: sum(done.filter((o) => o.createdAt >= d && o.createdAt < next)) })
    }

    const byStaff = new Map<string, { revenue: number; orders: number }>()
    for (const o of inRange(addDays(today0, -6))) {
      const cur = byStaff.get(o.staff) ?? { revenue: 0, orders: 0 }
      cur.revenue += Number(o.total)
      cur.orders += 1
      byStaff.set(o.staff, cur)
    }

    return {
      revenueToday: sum(inRange(today0)),
      revenue7Days: sum(inRange(addDays(today0, -6))),
      revenue30Days: sum(done),
      ordersCompleted30Days: done.length,
      staffCount: await this.staff.countBy({ active: true }),
      revenueByDay,
      revenueByStaff: [...byStaff.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
      topProducts: await this.topProducts(done),
    }
  }

  /** Chủ quán: danh sách tài khoản chủ quán / nhân viên (tài khoản khách hàng không nằm ở đây) */
  @Get('accounts')
  @Roles(Role.OWNER)
  async accounts() {
    const list = await this.users.find({ where: { role: Not('customer') }, order: { id: 'ASC' } })
    return list.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role }))
  }
  /**
   * Chủ quán + nhân viên: danh sách tài khoản KHÁCH HÀNG đã đăng ký (chỉ xem).
   * Khách hàng không gọi được API này; không trả về mật khẩu.
   * Số đơn / tổng chi tiêu được gom theo số điện thoại khách dùng khi đặt hàng.
   */
  @Get('customer-accounts')
  @Roles(Role.STAFF, Role.OWNER)
  async customerAccounts() {
    const list = await this.users.find({ where: { role: 'customer' }, order: { id: 'DESC' } })
    const phones = [...new Set(list.map((u) => u.phone).filter(Boolean))]
    const orders = phones.length
      ? await this.orders.find({ where: { phone: In(phones), status: Not(CANCELLED) } })
      : []
    const byPhone = new Map<string, { orders: number; spent: number; last: Date | null }>()
    for (const o of orders) {
      const cur = byPhone.get(o.phone) ?? { orders: 0, spent: 0, last: null }
      cur.orders += 1
      cur.spent += Number(o.total)
      if (!cur.last || o.createdAt > cur.last) cur.last = o.createdAt
      byPhone.set(o.phone, cur)
    }
    return list.map((u) => {
      const st = byPhone.get(u.phone)
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        createdAt: u.createdAt,
        orders: st?.orders ?? 0,
        spent: st?.spent ?? 0,
        lastOrderAt: st?.last ?? null,
      }
    })
  }

  /** Chủ quán: tạo tài khoản nhân viên (vừa có tài khoản đăng nhập, vừa có hồ sơ trong mục Nhân viên) */
  @Post('accounts')
  @Roles(Role.OWNER)
  async createStaff(@Body() body: { name?: string; email?: string; phone?: string; password?: string }) {
    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const phone = cleanPhone(body.phone)
    const password = body.password ?? ''
    if (!name) throw new BadRequestException('Vui lòng nhập họ tên')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('Email không hợp lệ')
    if (phone && !PHONE.test(phone)) throw new BadRequestException('Số điện thoại không hợp lệ (bắt đầu bằng 0, gồm 10-11 số)')
    if (password.length < 6) throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự')
    if (await this.users.findOneBy({ email })) throw new BadRequestException('Email này đã được đăng ký')

    const u = await this.users.save(
      this.users.create({ name, email, phone, passwordHash: hashPassword(password), role: 'staff' }),
    )
    await this.staff.save(this.staff.create({ name, role: 'Phục vụ', shift: 'Sáng (6h–12h)', phone, active: true }))
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role }
  }
  /** Chủ quán: cấp hoặc thu hồi quyền nhân viên */
  @Patch('accounts/:id/role')
  @Roles(Role.OWNER)
  async setRole(@Param('id', ParseIntPipe) id: number, @Body() body: { role?: string }) {
    if (body.role !== 'staff' && body.role !== 'user') {
      throw new BadRequestException('Vai trò chỉ có thể là staff hoặc user')
    }
    const user = await this.users.findOneBy({ id })
    if (!user) throw new BadRequestException('Không tìm thấy tài khoản')
    if (user.role === 'owner') throw new BadRequestException('Không đổi được vai trò của chủ quán')
    if (user.role === 'customer') throw new BadRequestException('Đây là tài khoản khách hàng, không cấp quyền nhân viên được')
    user.role = body.role
    await this.users.save(user)
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
  }
}