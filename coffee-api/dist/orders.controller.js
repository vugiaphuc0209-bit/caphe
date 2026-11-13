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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const store_status_service_1 = require("./store-status.service");
const METHODS = ['Tiền mặt', 'Chuyển khoản'];
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
let OrdersController = class OrdersController {
    constructor(orders, products, status) {
        this.orders = orders;
        this.products = products;
        this.status = status;
    }
    async calcTotal(lines) {
        if (!lines?.length)
            return 0;
        const ps = await this.products.findBy({ id: (0, typeorm_2.In)(lines.map((l) => l.id)) });
        return lines.reduce((s, l) => s + (ps.find((p) => p.id === l.id)?.price ?? 0) * l.qty, 0);
    }
    async nextId() {
        const all = await this.orders.find({ select: ['id'] });
        const max = all.reduce((m, o) => Math.max(m, parseInt(o.id.replace(/\D/g, '')) || 0), 1000);
        return 'DH' + (max + 1);
    }
    findAll() {
        return this.orders.find({ order: { createdAt: 'DESC', id: 'DESC' } });
    }
    async findOne(id) {
        const o = await this.orders.findOneBy({ id });
        if (!o)
            throw new common_1.NotFoundException('Không tìm thấy đơn');
        return o;
    }
    // body: { table: 'Bàn 3', lines: [{id: 1, qty: 2}], staff: 'Minh Anh', customer?, phone?, note?, payMethod? }
    async create(body) {
        // đơn do khách tự đặt trên web: quán đóng cửa thì không nhận
        if (body.staff === 'Khách đặt' && !this.status.isOpen()) {
            throw new common_1.BadRequestException('Quán đang đóng cửa, chưa nhận đơn');
        }
        const d = new Date();
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
            payMethod: METHODS.includes(body.payMethod ?? '') ? body.payMethod : 'Tiền mặt',
            paid: false, // đơn mới luôn chưa thanh toán, nhân viên xác nhận sau
        });
        return this.orders.save(order);
    }
    // sửa đơn (bàn, món, nhân viên, thanh toán, lý do huỷ) - tự tính lại tổng tiền
    async update(id, body) {
        const o = await this.findOne(id);
        if (body.table !== undefined)
            o.table = body.table;
        if (body.staff !== undefined)
            o.staff = body.staff;
        if (body.lines !== undefined) {
            o.lines = body.lines;
            o.total = await this.calcTotal(body.lines);
        }
        if (body.payMethod !== undefined && METHODS.includes(body.payMethod))
            o.payMethod = body.payMethod;
        if (body.paid !== undefined)
            o.paid = !!body.paid;
        if (body.cancelReason !== undefined)
            o.cancelReason = clean(body.cancelReason, 255);
        return this.orders.save(o);
    }
    // đổi trạng thái: body { status: 'Đang pha' } ; khi Hoàn thành sẽ cộng số lượng đã bán
    async setStatus(id, body) {
        const o = await this.findOne(id);
        if (body.status === 'Hoàn thành' && o.status !== 'Hoàn thành') {
            for (const l of o.lines)
                await this.products.increment({ id: l.id }, 'sold', l.qty);
        }
        o.status = body.status;
        return this.orders.save(o);
    }
    async remove(id) {
        await this.findOne(id);
        await this.orders.delete(id);
        return { deleted: true };
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "setStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "remove", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.OrderEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.ProductEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        store_status_service_1.StoreStatusService])
], OrdersController);
