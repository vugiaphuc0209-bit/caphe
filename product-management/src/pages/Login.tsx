import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth'
import type { Portal } from '../auth'

// Một trang đăng nhập dùng cho 2 cổng: khách hàng (#/dang-nhap) và nhân viên / chủ quán (#/dang-nhap-nv)
const TEXT = {
  customer: {
    title: 'Chào mừng bạn đến Hạt Coffee House',
    intro: 'Đăng nhập để đặt món nhanh hơn, số điện thoại của bạn sẽ được điền sẵn khi thanh toán.',
    sub: 'Dành cho khách hàng.',
    next: '/trang-chu', // khách đăng nhập xong vào thẳng trang chủ
    register: '#/dang-ky',
    other: { ask: 'Bạn là nhân viên hoặc chủ quán?', link: 'Đăng nhập tại đây', href: '#/dang-nhap-nv' },
  },
  staff: {
    title: 'Khu quản trị của quán',
    intro: 'Đăng nhập để bán hàng, theo dõi đơn, quản lý kho và xem báo cáo.',
    sub: 'Dành cho chủ quán và nhân viên.',
    next: '/',
    register: '#/dang-ky-nv',
    other: { ask: 'Bạn là khách hàng?', link: 'Đăng nhập tại đây', href: '#/dang-nhap' },
  },
} as const

export default function Login({ portal }: { portal: Portal }) {
  const t = TEXT[portal]
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await login(email, password, portal)
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
          <h1>Đăng nhập</h1>
          <p className="lg-sub">{t.sub}</p>
          {err && <div className="lg-err">{err}</div>}
          <label>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@email.com" required autoFocus />
          </label>
          <label>Mật khẩu
            <div className="lg-pw">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShow(!show)}>{show ? 'Ẩn' : 'Hiện'}</button>
            </div>
          </label>
          <button className="lg-btn" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          <p className="lg-alt">Chưa có tài khoản? <a href={t.register}>Đăng ký</a></p>
          <p className="lg-alt">{t.other.ask} <a href={t.other.href}>{t.other.link}</a></p>
        </form>
      </main>
    </div>
  )
}
