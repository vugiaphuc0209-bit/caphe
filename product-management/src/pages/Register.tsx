import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth'
import type { Portal } from '../auth'

// Một trang đăng ký dùng cho 2 cổng: khách hàng (#/dang-ky) và nhân viên (#/dang-ky-nv)
const TEXT = {
  customer: {
    title: 'Tạo tài khoản khách hàng',
    intro: 'Đăng ký để đặt món nhanh hơn. Số điện thoại của bạn sẽ được điền sẵn khi thanh toán.',
    next: '/trang-chu', // khách đăng ký xong vào thẳng trang chủ
    login: '#/dang-nhap',
    other: { ask: 'Bạn là nhân viên?', link: 'Đăng ký tại đây', href: '#/dang-ky-nv' },
  },
  staff: {
    title: 'Tạo tài khoản nhân viên',
    intro: 'Sau khi đăng ký, nhờ chủ quán cấp quyền nhân viên để vào khu quản trị.',
    next: '/',
    login: '#/dang-nhap-nv',
    other: { ask: 'Bạn là khách hàng?', link: 'Đăng ký tại đây', href: '#/dang-ky' },
  },
} as const

const PHONE = /^0\d{9,10}$/

export default function Register({ portal }: { portal: Portal }) {
  const t = TEXT[portal]
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const phoneClean = phone.replace(/\s/g, '')
  const phoneBad = phone !== '' && !PHONE.test(phoneClean)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!PHONE.test(phoneClean)) return setErr('Số điện thoại không hợp lệ (bắt đầu bằng 0, gồm 10-11 số)')
    if (password !== again) return setErr('Hai mật khẩu chưa giống nhau')
    setBusy(true)
    try {
      await register(name, email, phoneClean, password, portal)
      location.hash = t.next
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lg">
      <aside className="lg-side">
        <div className="lg-logo">Hạt Coffee House</div>
        <div>
          <div className="lg-ic">☕</div>
          <h2>{t.title}</h2>
          <p>{t.intro}</p>
        </div>
        <a className="lg-back" href="#/trang-chu">← Về trang chủ</a>
      </aside>

      <main className="lg-main">
        <form className="lg-box" onSubmit={submit}>
          <h1>Đăng ký</h1>
          <p className="lg-sub">Điền thông tin bên dưới để bắt đầu.</p>
          {err && <div className="lg-err">{err}</div>}
          <label>Họ tên
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" required autoFocus />
          </label>
          <label>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@email.com" required />
          </label>
          <label>Số điện thoại
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx xxx xxx"
              required
            />
            {phoneBad && <small style={{ color: '#b3382c' }}>Số điện thoại chưa hợp lệ</small>}
          </label>
          <label>Mật khẩu (ít nhất 6 ký tự)
            <div className="lg-pw">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              <button type="button" onClick={() => setShow(!show)}>{show ? 'Ẩn' : 'Hiện'}</button>
            </div>
          </label>
          <label>Nhập lại mật khẩu
            <input type={show ? 'text' : 'password'} value={again} onChange={(e) => setAgain(e.target.value)} required />
          </label>
          <button className="lg-btn" type="submit" disabled={busy}>{busy ? 'Đang tạo...' : 'Đăng ký'}</button>
          <p className="lg-alt">Đã có tài khoản? <a href={t.login}>Đăng nhập</a></p>
          <p className="lg-alt">{t.other.ask} <a href={t.other.href}>{t.other.link}</a></p>
        </form>
      </main>
    </div>
  )
}
