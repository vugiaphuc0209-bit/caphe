import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import './auth.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const KEY = 'coffee_token'

export type User = { id: number; name: string; email: string; phone?: string; role: string }
// cổng đăng nhập: khách hàng hoặc nhân viên / chủ quán
export type Portal = 'customer' | 'staff'

export const saved = () => {
  try { return localStorage.getItem(KEY) } catch { return null }
}
const keep = (t: string | null) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY) } catch { /* bỏ qua */ }
}

// gọi API, trả về thông báo lỗi tiếng Việt từ back end (nếu có)
export async function call<R>(path: string, method = 'GET', body?: unknown, token?: string | null): Promise<R> {
  let res: Response
  try {
    res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Không kết nối được máy chủ (localhost:3000). Back end đã chạy chưa?')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const m = data?.message
    throw new Error(Array.isArray(m) ? m.join(', ') : m ?? 'Có lỗi xảy ra, vui lòng thử lại')
  }
  return data as R
}

type AuthValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string, portal: Portal) => Promise<void>
  register: (name: string, email: string, phone: string, password: string, portal: Portal) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!saved())

  // mở lại trang: nếu còn token thì hỏi back end xem là ai
  useEffect(() => {
    const t = saved()
    if (!t) return
    call<User>('/auth/me', 'GET', undefined, t)
      .then(setUser)
      .catch(() => keep(null))
      .finally(() => setLoading(false))
  }, [])

  const done = (r: { token: string; user: User }) => {
    keep(r.token)
    setUser(r.user)
  }

  const value: AuthValue = {
    user,
    loading,
    login: async (email, password, portal) => done(await call('/auth/login', 'POST', { email, password, portal })),
    register: async (name, email, phone, password, portal) =>
      done(await call('/auth/register', 'POST', { name, email, phone, password, portal })),
    logout: () => {
      const customer = user?.role === 'customer'
      keep(null)
      setUser(null)
      // khách về trang chủ, nhân viên về trang đăng nhập nhân viên
      location.hash = customer ? '/trang-chu' : '/dang-nhap-nv'
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth phải nằm trong AuthProvider')
  return v
}
