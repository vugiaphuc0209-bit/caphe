"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
require("dotenv/config");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_controller_1 = require("./auth.controller");
const crud_1 = require("./crud");
const entities_1 = require("./entities");
const orders_controller_1 = require("./orders.controller");
const seed_1 = require("./seed");
const stats_controller_1 = require("./stats.controller");
const admin_module_1 = require("./admin/admin.module");
const store_status_controller_1 = require("./store-status.controller");
const store_status_service_1 = require("./store-status.service");
const DB_USER = process.env.DB_USER ?? 'root';
const DB_PASSWORD = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME ?? 'coffeedb';
// =================================================
const entities = [entities_1.ProductEntity, entities_1.OrderEntity, entities_1.TableEntity, entities_1.StockEntity, entities_1.StaffEntity, entities_1.CustomerEntity, entities_1.UserEntity];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
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
            typeorm_1.TypeOrmModule.forFeature(entities),
            admin_module_1.AdminModule,
        ],
        controllers: [
            (0, crud_1.makeCrud)('products', entities_1.ProductEntity),
            (0, crud_1.makeCrud)('tables', entities_1.TableEntity),
            (0, crud_1.makeCrud)('stock', entities_1.StockEntity),
            (0, crud_1.makeCrud)('staff', entities_1.StaffEntity),
            (0, crud_1.makeCrud)('customers', entities_1.CustomerEntity),
            orders_controller_1.OrdersController,
            stats_controller_1.StatsController,
            auth_controller_1.AuthController,
            store_status_controller_1.StoreStatusController,
        ],
        providers: [seed_1.SeedService, store_status_service_1.StoreStatusService],
    })
], AppModule);
