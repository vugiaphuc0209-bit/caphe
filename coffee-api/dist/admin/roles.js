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
exports.RolesGuard = exports.Roles = exports.Role = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const auth_controller_1 = require("../auth.controller");
const entities_1 = require("../entities");
var Role;
(function (Role) {
    Role["USER"] = "user";
    Role["STAFF"] = "staff";
    Role["OWNER"] = "owner";
})(Role || (exports.Role = Role = {}));
const Roles = (...roles) => (0, common_1.SetMetadata)('roles', roles);
exports.Roles = Roles;
let RolesGuard = class RolesGuard {
    constructor(reflector, users) {
        this.reflector = reflector;
        this.users = users;
    }
    async canActivate(ctx) {
        const required = this.reflector.getAllAndOverride('roles', [ctx.getHandler(), ctx.getClass()]);
        if (!required || required.length === 0)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const token = String(req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
        const id = (0, auth_controller_1.readToken)(token);
        const user = id ? await this.users.findOneBy({ id }) : null;
        if (!user)
            throw new common_1.UnauthorizedException('Chưa đăng nhập hoặc phiên đã hết hạn');
        if (!required.includes(user.role)) {
            throw new common_1.ForbiddenException('Bạn không có quyền truy cập mục này');
        }
        req.user = user;
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.UserEntity)),
    __metadata("design:paramtypes", [core_1.Reflector,
        typeorm_2.Repository])
], RolesGuard);
