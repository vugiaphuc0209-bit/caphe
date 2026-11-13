import { useEffect, useMemo, useState } from 'react'
import { call, saved } from '../auth'
import { Head, vnd } from '../ui'

// Tài khoản khách hàng tự đăng ký ở cổng khách hàng. Chỉ chủ quán và nhân viên vào được (xem, không sửa).
type Acc = {
  id: number
  name: string
  email: string
  phone: string
  createdAt: string
  orders: number
  spent: number
  lastOrderAt: string | null
}

type Sort = 'newest' | 'spent' | 'orders' | 'name'

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')
const initial = (n: string) => n.trim().split(' ').pop()?.[0]?.toUpperCase() ?? '?'
const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString()
const isThisMonth = (d: string) => {
  const x = new Date(d), n = new Date()
  return x.getMonth() === n.getMonth() && x.getFullYear() === n.getFullYear()
}

export default function CustomerAccounts() {
  const [list, setList] = useState<Acc[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [onlyBought, setOnlyBought] = useState(false)

  const load = () => {
    setLoading(true)
    call<Acc[]>('/admin/customer-accounts', 'GET', undefined, saved())
      .then((r) => { setList(r); setErr('') })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    const kp = k.replace(/\s/g, '')
    const rows = list.filter(
      (a) =>
        (!onlyBought || a.orders > 0) &&
        (!k || a.name.toLowerCase().includes(k) || a.email.toLowerCase().includes(k) || (kp && a.phone.includes(kp))),
    )
    if (sort === 'spent') rows.sort((a, b) => b.spent - a.spent)
    else if (sort === 'orders') rows.sort((a, b) => b.orders - a.orders)
    else if (sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    else rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    return rows
  }, [list, q, sort, onlyBought])

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = [
      ['Họ tên', 'Email', 'Số điện thoại', 'Ngày đăng ký', 'Số đơn', 'Tổng chi tiêu'],
      ...shown.map((a) => [a.name, a.email, a.phone, fmt(a.createdAt), a.orders, a.spent]),
    ]
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'tai-khoan-khach-hang.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <Head
        title="Tài khoản khách hàng"
        sub={`${list.length} tài khoản đã đăng ký · ${shown.length} đang hiển thị`}
        action={
          <div className="acts">
            <button className="btn" onClick={load}>Làm mới</button>
            <button className="btn pri" onClick={exportCsv} disabled={shown.length === 0}>Xuất Excel</button>
          </div>
        }
      />
      <p className="ad-note">
        Danh sách khách hàng tự đăng ký trên website. Chỉ chủ quán và nhân viên xem được. Số đơn và chi tiêu được tính theo số điện thoại khách dùng khi đặt hàng.
      </p>
      {err && <p className="ad-err">{err}</p>}

      <div className="stats">
        <div className="stat"><span>Tổng tài khoản</span><b>{list.length}</b></div>
        <div className="stat ok"><span>Đăng ký hôm nay</span><b>{list.filter((a) => isToday(a.createdAt)).length}</b></div>
        <div className="stat"><span>Đăng ký tháng này</span><b>{list.filter((a) => isThisMonth(a.createdAt)).length}</b></div>
        <div className="stat warn"><span>Đã từng đặt hàng</span><b>{list.filter((a) => a.orders > 0).length}</b></div>
      </div>

      <div className="cust-bar">
        <input placeholder="Tìm theo tên, email hoặc số điện thoại..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="cust-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">Mới đăng ký nhất</option>
          <option value="spent">Chi tiêu nhiều nhất</option>
          <option value="orders">Đặt nhiều đơn nhất</option>
          <option value="name">Tên A đến Z</option>
        </select>
      </div>
      <div className="chips cust-chips">
        <button className={'chip' + (!onlyBought ? ' on' : '')} onClick={() => setOnlyBought(false)}>Tất cả ({list.length})</button>
        <button className={'chip' + (onlyBought ? ' on' : '')} onClick={() => setOnlyBought(true)}>
          Đã đặt hàng ({list.filter((a) => a.orders > 0).length})
        </button>
      </div>

      <section className="card wrap">
        <table>
          <thead>
            <tr>
              <th>Khách hàng</th><th>Email</th><th>Số điện thoại</th><th>Ngày đăng ký</th>
              <th className="r">Số đơn</th><th className="r">Tổng chi tiêu</th><th>Đơn gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id}>
                <td><span className="avatar">{initial(a.name)}</span> {a.name}</td>
                <td>{a.email}</td>
                <td>{a.phone || '—'}</td>
                <td>{fmt(a.createdAt)}</td>
                <td className="r">{a.orders}</td>
                <td className="r">{vnd(a.spent)}</td>
                <td>{fmt(a.lastOrderAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="empty">Đang tải...</p>}
        {!loading && shown.length === 0 && (
          <p className="empty">{list.length === 0 ? 'Chưa có khách hàng nào đăng ký tài khoản.' : 'Không tìm thấy tài khoản nào khớp.'}</p>
        )}
      </section>
    </>
  )
}
