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
exports.StoreStatusController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const auth_controller_1 = require("./auth.controller");
const entities_1 = require("./entities");
const store_status_service_1 = require("./store-status.service");
let StoreStatusController = class StoreStatusController {
    constructor(status, users) {
        this.status = status;
        this.users = users;
    }
    // ai cũng xem được (khách, chưa đăng nhập)
    get() {
        return { mode: this.status.mode };
    }
    // chỉ chủ quán và nhân viên được đổi
    async set(auth, mode) {
        const id = (0, auth_controller_1.readToken)((auth ?? '').replace(/^Bearer\s+/i, ''));
        const user = id ? await this.users.findOneBy({ id }) : null;
        if (!user)
            throw new common_1.UnauthorizedException('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
        if (user.role !== 'staff' && user.role !== 'owner') {
            throw new common_1.ForbiddenException('Chỉ chủ quán và nhân viên mới đổi được trạng thái cửa hàng');
        }
        if (!['auto', 'open', 'closed'].includes(mode))
            throw new common_1.BadRequestException('Trạng thái không hợp lệ');
        this.status.set(mode);
        return { mode: this.status.mode };
    }
};
exports.StoreStatusController = StoreStatusController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StoreStatusController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)('mode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StoreStatusController.prototype, "set", null);
exports.StoreStatusController = StoreStatusController = __decorate([
    (0, common_1.Controller)('store-status'),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.UserEntity)),
    __metadata("design:paramtypes", [store_status_service_1.StoreStatusService,
        typeorm_2.Repository])
], StoreStatusController);
