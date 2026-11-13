import { BadRequestException, Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { Repository } from 'typeorm'
import { UserEntity } from './entities'

const SECRET = process.env.JWT_SECRET ?? 'coffee-dev-secret-hay-doi-di'
const EXPIRES = 7 * 24 * 3600 // 7 ngày

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url')
const sign = (data: string) => createHmac('sha256', SECRET).update(data).digest('base64url')

function makeToken(userId: number) {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + EXPIRES }))
  return `${head}.${body}.${sign(head + '.' + body)}`
}

export function readToken(token: string): number | null {
  const [head, body, sig] = (token ?? '').split('.')
  if (!head || !body || !sig || sign(head + '.' + body) !== sig) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    return p.exp > Date.now() / 1000 ? Number(p.sub) : null
  } catch {
    return null
  }
}
export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex')
  return salt + ':' + scryptSync(pw, salt, 64).toString('hex')
}

function checkPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(':')
  const a = Buffer.from(hash, 'hex')
  const b = scryptSync(pw, salt, 64)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const PHONE = /^0\d{9,10}$/
export const cleanPhone = (v: unknown) => String(v ?? '').replace(/\s/g, '')

// 'customer' = cổng khách hàng, 'staff' = cổng nhân viên / chủ quán (không gửi gì thì coi là khách hàng)
type Portal = 'customer' | 'staff'
const portalOf = (v: unknown): Portal => (v === 'staff' ? 'staff' : 'customer')

const publicUser = (u: UserEntity) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role })

@Controller('auth')
export class AuthController {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  @Post('register')
  async register(@Body() body: { name?: string; email?: string; phone?: string; password?: string; portal?: string }) {
    const portal = portalOf(body.portal)
    const name = (body.name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    const phone = cleanPhone(body.phone)
    const password = body.password ?? ''
    if (!name) throw new BadRequestException('Vui lòng nhập họ tên')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('Email không hợp lệ')
    if (!PHONE.test(phone)) throw new BadRequestException('Số điện thoại không hợp lệ (bắt đầu bằng 0, gồm 10-11 số)')
    if (password.length < 6) throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự')
    if (await this.users.findOneBy({ email })) throw new BadRequestException('Email này đã được đăng ký')

    // Khách hàng đăng ký ở cổng khách hàng: luôn là 'customer'.
    // Cổng nhân viên: tài khoản đầu tiên khi chưa có chủ quán sẽ là chủ quán, còn lại chờ chủ quán cấp quyền ('user')
    let role = 'customer'
    if (portal === 'staff') {
      const hasOwner = (await this.users.countBy({ role: 'owner' })) > 0
      role = hasOwner ? 'user' : 'owner'
    }
    const user = await this.users.save(
      this.users.create({ name, email, phone, passwordHash: hashPassword(password), role }),
    )
    return { token: makeToken(user.id), user: publicUser(user) }
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string; portal?: string }) {
    const portal = portalOf(body.portal)
    const email = (body.email ?? '').trim().toLowerCase()
    const user = await this.users.findOneBy({ email })
    if (!user || !checkPassword(body.password ?? '', user.passwordHash)) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }
    // Đúng mật khẩu nhưng vào nhầm cổng: báo để người dùng sang đúng trang đăng nhập
    if (portal === 'customer' && user.role !== 'customer') {
      throw new UnauthorizedException('Đây là tài khoản nhân viên / chủ quán. Hãy đăng nhập ở trang dành cho nhân viên')
    }
    if (portal === 'staff' && user.role === 'customer') {
      throw new UnauthorizedException('Đây là tài khoản khách hàng. Hãy đăng nhập ở trang dành cho khách hàng')
    }
    // Tài khoản cũ (chưa có vai trò): nếu hệ thống chưa có chủ quán thì người đăng nhập đầu tiên làm chủ quán
    if (portal === 'staff' && user.role !== 'owner' && (await this.users.countBy({ role: 'owner' })) === 0) {
      user.role = 'owner'
      await this.users.save(user)
    }
    return { token: makeToken(user.id), user: publicUser(user) }
  }

  @Get('me')
  async me(@Headers('authorization') auth?: string) {
    const id = readToken((auth ?? '').replace(/^Bearer\s+/i, ''))
    const user = id ? await this.users.findOneBy({ id }) : null
    if (!user) throw new UnauthorizedException('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại')
    return publicUser(user)
  }
}
