import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth'
import type { Portal } from './auth'
import { StoreProvider } from './store'
import './admin.css'
import Home from './pages/Home'
import type { PublicPage } from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Overview from './pages/Overview'
import Accounts from './pages/Accounts'
import Pos from './pages/Pos'
import Orders from './pages/Orders'
import Bar from './pages/Bar'
import Tables from './pages/Tables'
import Menu from './pages/Menu'
import Inventory from './pages/Inventory'
import Staff from './pages/Staff'
import Customers from './pages/Customers'
import CustomerAccounts from './pages/CustomerAccounts'
import Reports from './pages/Reports'

// Trang công khai (không trùng với đường dẫn khu quản trị)
const PUBLIC: Record<string, PublicPage> = {
  '/trang-chu': 'home',
  '/menu': 'menu',
  '/ve-chung-toi': 'about',
  '/lien-he': 'contact',
}

// Trang đăng nhập / đăng ký: khách hàng và nhân viên tách riêng
const AUTH_PAGES: Record<string, { portal: Portal; kind: 'login' | 'register' }> = {
  '/dang-nhap': { portal: 'customer', kind: 'login' },
  '/dang-ky': { portal: 'customer', kind: 'register' },
  '/dang-nhap-nv': { portal: 'staff', kind: 'login' },
  '/dang-ky-nv': { portal: 'staff', kind: 'register' },
}

const STAFF = 'staff'
const OWNER = 'owner'
const CUSTOMER = 'customer'

// roles: vai trò được thấy mục này (nhân viên + chủ quán, hoặc chỉ chủ quán)
const routes = [
  { path: '/', label: 'Tổng quan', el: <Overview />, roles: [STAFF, OWNER] },
  { path: '/ban-hang', label: 'Bán hàng', el: <Pos />, roles: [STAFF, OWNER] },
  { path: '/pha-che', label: 'Pha chế', el: <Bar />, roles: [STAFF, OWNER] },
  { path: '/don-hang', label: 'Đơn hàng', el: <Orders />, roles: [STAFF, OWNER] },
  { path: '/ban', label: 'Sơ đồ bàn', el: <Tables />, roles: [STAFF, OWNER] },
  { path: '/kho', label: 'Kho nguyên liệu', el: <Inventory />, roles: [STAFF, OWNER] },
  { path: '/khach-hang', label: 'Khách hàng', el: <Customers />, roles: [STAFF, OWNER] },
  { path: '/tai-khoan-khach', label: 'Tài khoản khách hàng', el: <CustomerAccounts />, roles: [STAFF, OWNER] },
  { path: '/thuc-don', label: 'Bảng giá / Thực đơn', el: <Menu />, roles: [OWNER] },
  { path: '/bao-cao', label: 'Báo cáo doanh thu', el: <Reports />, roles: [OWNER] },
  { path: '/nhan-vien', label: 'Quản lý nhân viên', el: <Staff />, roles: [OWNER] },
  { path: '/tai-khoan', label: 'Tài khoản & phân quyền', el: <Accounts />, roles: [OWNER] },
]

function useRoute() {
  const [hash, setHash] = useState(location.hash.slice(1) || '/')
  useEffect(() => {
    const f = () => setHash(location.hash.slice(1) || '/')
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return hash
}

function Gate() {
  const { user, loading, logout } = useAuth()
  const path = useRoute()

  if (loading) return <div className="auth"><p className="auth-loading">Đang tải...</p></div>

  // Các trang công khai, ai cũng xem được (kể cả khi đã đăng nhập)
  const pub = PUBLIC[path]
  if (pub) return <Home page={pub} />

  // Chưa đăng nhập: trang chủ công khai, hoặc trang đăng nhập / đăng ký của khách hàng và nhân viên
  if (!user) {
    const a = AUTH_PAGES[path]
    if (a) return a.kind === 'login' ? <Login portal={a.portal} /> : <Register portal={a.portal} />
    return <Home page="home" />
  }

  // Khách hàng chỉ dùng trang công khai (trang chủ, thực đơn...), không vào khu quản trị
  if (user.role === CUSTOMER) return <Home page="home" />

  // Đã đăng nhập nhưng chưa được cấp quyền
  if (user.role !== OWNER && user.role !== STAFF) {
    return (
      <div className="ad-deny">
        <div>
          <h2>Tài khoản chưa được cấp quyền</h2>
          <p>Xin chào {user.name}. Hãy nhờ chủ quán cấp quyền nhân viên cho tài khoản {user.email}.</p>
          <button className="ad-btn" onClick={logout}>Đăng xuất</button>
        </div>
      </div>
    )
  }

  const visible = routes.filter((r) => r.roles.includes(user.role))
  const page = visible.find((r) => r.path === path) ?? visible[0]

  return (
    <StoreProvider>
      <div className="app">
        <aside className="side">
          <div className="brand">Hạt Coffee House</div>
          <nav className="nav">
            {visible.map((r) => (
              <a key={r.path} href={'#' + r.path} className={r.path === page.path ? 'on' : ''}>{r.label}</a>
            ))}
            <a href="#/trang-chu">← Về trang chủ</a>
          </nav>
          <div className="me">
            <div><b>{user.name}</b>{user.email} · {user.role === OWNER ? 'Chủ quán' : 'Nhân viên'}</div>
            <button className="logout" onClick={logout}>Đăng xuất</button>
          </div>
        </aside>
        <main className="main">{page.el}</main>
      </div>
    </StoreProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}