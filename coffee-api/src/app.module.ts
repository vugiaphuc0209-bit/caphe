import 'dotenv/config'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { makeCrud } from './crud'
import { CustomerEntity, OrderEntity, ProductEntity, StaffEntity, StockEntity, TableEntity, UserEntity } from './entities'
import { OrdersController } from './orders.controller'
import { SeedService } from './seed'
import { StatsController } from './stats.controller'
import { AdminModule } from './admin/admin.module'
import { StoreStatusController } from './store-status.controller'
import { StoreStatusService } from './store-status.service'

const DB_USER = process.env.DB_USER ?? 'root'
const DB_PASSWORD = process.env.DB_PASSWORD ?? ''
const DB_NAME = process.env.DB_NAME ?? 'coffeedb'
// =================================================

const entities = [ProductEntity, OrderEntity, TableEntity, StockEntity, StaffEntity, CustomerEntity, UserEntity]

@Module({
  imports: [
    TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  entities,
  synchronize: true,
}),
    TypeOrmModule.forFeature(entities),
    AdminModule,
  ],
  controllers: [
    makeCrud('products', ProductEntity),
    makeCrud('tables', TableEntity),
    makeCrud('stock', StockEntity),
    makeCrud('staff', StaffEntity),
    makeCrud('customers', CustomerEntity),
    OrdersController,
    StatsController,
    AuthController,
    StoreStatusController,
  ],
  providers: [SeedService, StoreStatusService],
})
export class AppModule {}