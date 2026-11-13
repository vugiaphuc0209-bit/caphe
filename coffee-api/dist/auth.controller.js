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
exports.AuthController = exports.cleanPhone = exports.PHONE = void 0;
exports.readToken = readToken;
exports.hashPassword = hashPassword;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const entities_1 = require("./entities");
const SECRET = process.env.JWT_SECRET ?? 'coffee-dev-secret-hay-doi-di';
const EXPIRES = 7 * 24 * 3600; // 7 ngày
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => (0, crypto_1.createHmac)('sha256', SECRET).update(data).digest('base64url');
function makeToken(userId) {
    const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + EXPIRES }));
    return `${head}.${body}.${sign(head + '.' + body)}`;
}
function readToken(token) {
    const [head, body, sig] = (token ?? '').split('.');
    if (!head || !body || !sig || sign(head + '.' + body) !== sig)
        return null;
    try {
        const p = JSON.parse(Buffer.from(body, 'base64url').toString());
        return p.exp > Date.now() / 1000 ? Number(p.sub) : null;
    }
    catch {
        return null;
    }
}
function hashPassword(pw) {
    const salt = (0, crypto_1.randomBytes)(16).toString('hex');
    return salt + ':' + (0, crypto_1.scryptSync)(pw, salt, 64).toString('hex');
}
function checkPassword(pw, stored) {
    const [salt, hash] = stored.split(':');
    const a = Buffer.from(hash, 'hex');
    const b = (0, crypto_1.scryptSync)(pw, salt, 64);
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
}
exports.PHONE = /^0\d{9,10}$/;
const cleanPhone = (v) => String(v ?? '').replace(/\s/g, '');
exports.cleanPhone = cleanPhone;
const portalOf = (v) => (v === 'staff' ? 'staff' : 'customer');
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });
let AuthController = class AuthController {
    constructor(users) {
        this.users = users;
    }
    async register(body) {
        const portal = portalOf(body.portal);
        const name = (body.name ?? '').trim();
        const email = (body.email ?? '').trim().toLowerCase();
        const phone = (0, exports.cleanPhone)(body.phone);
        const password = body.password ?? '';
        if (!name)
            throw new common_1.BadRequestException('Vui lòng nhập họ tên');
        if (!/^\S+@\S+\.\S+$/.test(email))
            throw new common_1.BadRequestException('Email không hợp lệ');
        if (!exports.PHONE.test(phone))
            throw new common_1.BadRequestException('Số điện thoại không hợp lệ (bắt đầu bằng 0, gồm 10-11 số)');
        if (password.length < 6)
            throw new common_1.BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
        if (await this.users.findOneBy({ email }))
            throw new common_1.BadRequestException('Email này đã được đăng ký');
        // Khách hàng đăng ký ở cổng khách hàng: luôn là 'customer'.
        // Cổng nhân viên: tài khoản đầu tiên khi chưa có chủ quán sẽ là chủ quán, còn lại chờ chủ quán cấp quyền ('user')
        let role = 'customer';
        if (portal === 'staff') {
            const hasOwner = (await this.users.countBy({ role: 'owner' })) > 0;
            role = hasOwner ? 'user' : 'owner';
        }
        const user = await this.users.save(this.users.create({ name, email, phone, passwordHash: hashPassword(password), role }));
        return { token: makeToken(user.id), user: publicUser(user) };
    }
    async login(body) {
        const portal = portalOf(body.portal);
        const email = (body.email ?? '').trim().toLowerCase();
        const user = await this.users.findOneBy({ email });
        if (!user || !checkPassword(body.password ?? '', user.passwordHash)) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
        }
        // Đúng mật khẩu nhưng vào nhầm cổng: báo để người dùng sang đúng trang đăng nhập
        if (portal === 'customer' && user.role !== 'customer') {
            throw new common_1.UnauthorizedException('Đây là tài khoản nhân viên / chủ quán. Hãy đăng nhập ở trang dành cho nhân viên');
        }
        if (portal === 'staff' && user.role === 'customer') {
            throw new common_1.UnauthorizedException('Đây là tài khoản khách hàng. Hãy đăng nhập ở trang dành cho khách hàng');
        }
        // Tài khoản cũ (chưa có vai trò): nếu hệ thống chưa có chủ quán thì người đăng nhập đầu tiên làm chủ quán
        if (portal === 'staff' && user.role !== 'owner' && (await this.users.countBy({ role: 'owner' })) === 0) {
            user.role = 'owner';
            await this.users.save(user);
        }
        return { token: makeToken(user.id), user: publicUser(user) };
    }
    async me(auth) {
        const id = readToken((auth ?? '').replace(/^Bearer\s+/i, ''));
        const user = id ? await this.users.findOneBy({ id }) : null;
        if (!user)
            throw new common_1.UnauthorizedException('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
        return publicUser(user);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuthController);
