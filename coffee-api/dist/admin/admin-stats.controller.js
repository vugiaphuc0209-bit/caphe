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
exports.AdminStatsController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_controller_1 = require("../auth.controller");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
const roles_1 = require("./roles");
const DONE = 'Hoàn thành';
const CANCELLED = 'Đã huỷ';
const PENDING = ['Chờ pha chế', 'Đang pha'];
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
let AdminStatsController = class AdminStatsController {
    constructor(orders, products, staff, users, tables, stock) {
        this.orders = orders;
        this.products = products;
        this.staff = staff;
        this.users = users;
        this.tables = tables;
        this.stock = stock;
    }
    ordersSince(from) {
        return this.orders.find({ where: { createdAt: (0, typeorm_2.MoreThanOrEqual)(from) } });
    }
    async topProducts(orders, limit = 5) {
        const qty = new Map();
        for (const o of orders)
            for (const l of o.lines ?? [])
                qty.set(l.id, (qty.get(l.id) ?? 0) + l.qty);
        if (qty.size === 0)
            return [];
        const names = new Map((await this.products.find()).map((p) => [p.id, p.name]));
        return [...qty.entries()]
            .map(([id, q]) => ({ name: names.get(id) ?? `Món #${id}`, qty: q }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, limit);
    }
    /** Nhân viên và chủ quán: tình hình hôm nay (không có số tiền, doanh thu chỉ dành cho chủ quán) */
    async today() {
        const today0 = startOfDay(new Date());
        const week = await this.ordersSince(addDays(today0, -6));
        const todayAll = week.filter((o) => o.createdAt >= today0);
        const valid = todayAll.filter((o) => o.status !== CANCELLED);
        const weekValid = week.filter((o) => o.status !== CANCELLED);
        const byStatus = (st) => todayAll.filter((o) => o.status === st).length;
        const ordersByHour = Array.from({ length: 24 }, (_, h) => ({
            hour: h,
            orders: valid.filter((o) => o.createdAt.getHours() === h).length,
        }));
        const ordersByDay = Array.from({ length: 7 }, (_, i) => {
            const d = addDays(today0, i - 6);
            const next = addDays(d, 1);
            return { date: dayKey(d), orders: weekValid.filter((o) => o.createdAt >= d && o.createdAt < next).length };
        });
        const tables = await this.tables.find();
        const lowStock = (await this.stock.find())
            .filter((x) => x.qty <= x.min)
            .sort((a, b) => a.qty / Math.max(a.min, 1) - b.qty / Math.max(b.min, 1))
            .map((x) => ({ name: x.name, qty: x.qty, unit: x.unit, min: x.min }));
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
        }));
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
        };
    }
    /** Chỉ chủ quán: doanh thu, nhân viên */
    async revenue() {
        const today0 = startOfDay(new Date());
        const done = (await this.ordersSince(addDays(today0, -29))).filter((o) => o.status === DONE);
        const sum = (list) => list.reduce((s, o) => s + Number(o.total), 0);
        const inRange = (from) => done.filter((o) => o.createdAt >= from);
        const revenueByDay = [];
        for (let i = 6; i >= 0; i--) {
            const d = addDays(today0, -i);
            const next = addDays(d, 1);
            revenueByDay.push({ date: dayKey(d), revenue: sum(done.filter((o) => o.createdAt >= d && o.createdAt < next)) });
        }
        const byStaff = new Map();
        for (const o of inRange(addDays(today0, -6))) {
            const cur = byStaff.get(o.staff) ?? { revenue: 0, orders: 0 };
            cur.revenue += Number(o.total);
            cur.orders += 1;
            byStaff.set(o.staff, cur);
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
        };
    }
    /** Chủ quán: danh sách tài khoản chủ quán / nhân viên (tài khoản khách hàng không nằm ở đây) */
    async accounts() {
        const list = await this.users.find({ where: { role: (0, typeorm_2.Not)('customer') }, order: { id: 'ASC' } });
        return list.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role }));
    }
    /**
     * Chủ quán + nhân viên: danh sách tài khoản KHÁCH HÀNG đã đăng ký (chỉ xem).
     * Khách hàng không gọi được API này; không trả về mật khẩu.
     * Số đơn / tổng chi tiêu được gom theo số điện thoại khách dùng khi đặt hàng.
     */
    async customerAccounts() {
        const list = await this.users.find({ where: { role: 'customer' }, order: { id: 'DESC' } });
        const phones = [...new Set(list.map((u) => u.phone).filter(Boolean))];
        const orders = phones.length
            ? await this.orders.find({ where: { phone: (0, typeorm_2.In)(phones), status: (0, typeorm_2.Not)(CANCELLED) } })
            : [];
        const byPhone = new Map();
        for (const o of orders) {
            const cur = byPhone.get(o.phone) ?? { orders: 0, spent: 0, last: null };
            cur.orders += 1;
            cur.spent += Number(o.total);
            if (!cur.last || o.createdAt > cur.last)
                cur.last = o.createdAt;
            byPhone.set(o.phone, cur);
        }
        return list.map((u) => {
            const st = byPhone.get(u.phone);
            return {
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                createdAt: u.createdAt,
                orders: st?.orders ?? 0,
                spent: st?.spent ?? 0,
                lastOrderAt: st?.last ?? null,
            };
        });
    }
    /** Chủ quán: tạo tài khoản nhân viên (vừa có tài khoản đăng nhập, vừa có hồ sơ trong mục Nhân viên) */
    async createStaff(body) {
        const name = (body.name ?? '').trim();
        const email = (body.email ?? '').trim().toLowerCase();
        const phone = (0, auth_controller_1.cleanPhone)(body.phone);
        const password = body.password ?? '';
        if (!name)
            throw new common_1.BadRequestException('Vui lòng nhập họ tên');
        if (!/^\S+@\S+\.\S+$/.test(email))
            throw new common_1.BadRequestException('Email không hợp lệ');
        if (phone && !auth_controller_1.PHONE.test(phone))
            throw new common_1.BadRequestException('Số điện thoại không hợp lệ (bắt đầu bằng 0, gồm 10-11 số)');
        if (password.length < 6)
            throw new common_1.BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
        if (await this.users.findOneBy({ email }))
            throw new common_1.BadRequestException('Email này đã được đăng ký');
        const u = await this.users.save(this.users.create({ name, email, phone, passwordHash: (0, auth_controller_1.hashPassword)(password), role: 'staff' }));
        await this.staff.save(this.staff.create({ name, role: 'Phục vụ', shift: 'Sáng (6h–12h)', phone, active: true }));
        return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
    }
    /** Chủ quán: cấp hoặc thu hồi quyền nhân viên */
    async setRole(id, body) {
        if (body.role !== 'staff' && body.role !== 'user') {
            throw new common_1.BadRequestException('Vai trò chỉ có thể là staff hoặc user');
        }
        const user = await this.users.findOneBy({ id });
        if (!user)
            throw new common_1.BadRequestException('Không tìm thấy tài khoản');
        if (user.role === 'owner')
            throw new common_1.BadRequestException('Không đổi được vai trò của chủ quán');
        if (user.role === 'customer')
            throw new common_1.BadRequestException('Đây là tài khoản khách hàng, không cấp quyền nhân viên được');
        user.role = body.role;
        await this.users.save(user);
        return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
    }
};
exports.AdminStatsController = AdminStatsController;
__decorate([
    (0, common_1.Get)('stats/today'),
    (0, roles_1.Roles)(roles_1.Role.STAFF, roles_1.Role.OWNER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "today", null);
__decorate([
    (0, common_1.Get)('stats/revenue'),
    (0, roles_1.Roles)(roles_1.Role.OWNER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "revenue", null);
__decorate([
    (0, common_1.Get)('accounts'),
    (0, roles_1.Roles)(roles_1.Role.OWNER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "accounts", null);
__decorate([
    (0, common_1.Get)('customer-accounts'),
    (0, roles_1.Roles)(roles_1.Role.STAFF, roles_1.Role.OWNER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "customerAccounts", null);
__decorate([
    (0, common_1.Post)('accounts'),
    (0, roles_1.Roles)(roles_1.Role.OWNER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "createStaff", null);
__decorate([
    (0, common_1.Patch)('accounts/:id/role'),
    (0, roles_1.Roles)(roles_1.Role.OWNER),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "setRole", null);
exports.AdminStatsController = AdminStatsController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(roles_1.RolesGuard),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.OrderEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.ProductEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.StaffEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.UserEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.TableEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.StockEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminStatsController);
