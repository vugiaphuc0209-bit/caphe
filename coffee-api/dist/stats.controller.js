"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const seed_1 = require("./seed");
let StatsController = class StatsController {
    constructor(orders) {
        this.orders = orders;
    }
    async get() {
        const done = await this.orders.findBy({ status: 'Hoàn thành' });
        return {
            revenueDone: done.reduce((s, o) => s + o.total, 0),
            ordersDone: done.length,
            ordersAll: await this.orders.count(),
            week: seed_1.week, // doanh thu theo ngày (dữ liệu mẫu)
            month: // doanh thu theo ngày (dữ liệu mẫu)
            seed_1.month, // doanh thu theo tuần (dữ liệu mẫu)
        };
    }
};
exports.StatsController = StatsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StatsController.prototype, "get", null);
exports.StatsController = StatsController = __decorate([
    (0, common_1.Controller)('stats'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.OrderEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StatsController);
