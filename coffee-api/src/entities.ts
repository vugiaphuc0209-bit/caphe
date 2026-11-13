import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm'

export type OrderStatus = 'Chờ pha chế' | 'Đang pha' | 'Hoàn thành' | 'Đã huỷ'
export type TableStatus = 'Trống' | 'Có khách' | 'Đã đặt'

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn() id: number
  @Column() name: string
  @Column() cat: string
  @Column() price: number
  @Column({ default: true }) active: boolean
  @Column({ default: 0 }) sold: number
}

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn() id: string
  @Column() table: string
  @Column('json') lines: { id: number; qty: number }[]
  @Column({ default: 'Chờ pha chế' }) status: OrderStatus
  @Column() time: string
  @Column() staff: string
  @Column({ default: 0 }) total: number
  // thông tin khách đặt qua web và thanh toán
  @Column({ type: 'varchar', length: 100, default: '' }) customer: string
  @Column({ type: 'varchar', length: 20, default: '' }) phone: string
  @Column({ type: 'varchar', length: 500, default: '' }) note: string
  @Column({ type: 'varchar', length: 20, default: 'Tiền mặt' }) payMethod: string
  @Column({ default: false }) paid: boolean
  @Column({ type: 'varchar', length: 255, default: '' }) cancelReason: string
  @CreateDateColumn() createdAt: Date
}

@Entity('tables')
export class TableEntity {
  @PrimaryGeneratedColumn() id: number
  @Column() name: string
  @Column() seats: number
  @Column({ default: 'Trống' }) status: TableStatus
}

@Entity('stock')
export class StockEntity {
  @PrimaryGeneratedColumn() id: number
  @Column() name: string
  @Column() unit: string
  @Column() qty: number
  @Column() min: number
  @Column() max: number
  @Column() supplier: string
}

@Entity('staff')
export class StaffEntity {
  @PrimaryGeneratedColumn() id: number
  @Column() name: string
  @Column() role: string
  @Column() shift: string
  @Column() phone: string
  @Column({ default: true }) active: boolean
}

@Entity('customers')
export class CustomerEntity {
  @PrimaryGeneratedColumn() id: number
  @Column() name: string
  @Column() phone: string
  @Column({ default: 0 }) visits: number
  @Column({ type: 'bigint', default: 0, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } }) spent: number
  @Column({ default: '' }) last: string
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn() id: number
  @Column() name: string
  @Column({ unique: true }) email: string
  @Column({ type: 'varchar', length: 20, default: '' }) phone: string
  @Column() passwordHash: string
  // owner = chủ quán, staff = nhân viên, customer = khách hàng, user = nhân viên đăng ký chờ chủ quán cấp quyền
  @Column({ default: 'user' }) role: string
  @CreateDateColumn() createdAt: Date
}