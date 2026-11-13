import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderEntity, ProductEntity, StaffEntity, StockEntity, TableEntity, UserEntity } from '../entities'
import { AdminStatsController } from './admin-stats.controller'
import { RolesGuard } from './roles'

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, ProductEntity, StaffEntity, StockEntity, TableEntity, UserEntity])],
  controllers: [AdminStatsController],
  providers: [RolesGuard],
})
export class AdminModule {}