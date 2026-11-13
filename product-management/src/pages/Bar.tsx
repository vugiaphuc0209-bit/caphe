import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { OrderStatus } from '../data'
import { Head } from '../ui'

const cols: { status: OrderStatus; title: string; btn: string; to: OrderStatus }[] = [
  { status: 'Chờ pha chế', title: 'Chờ pha chế', btn: 'Bắt đầu pha', to: 'Đang pha' },
  { status: 'Đang pha', title: 'Đang pha', btn: 'Pha xong', to: 'Hoàn thành' },
]

// số phút đã trôi qua kể từ giờ tạo đơn (định dạng "HH:MM")
function waited(time: string) {
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const now = new Date()
  const diff = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
  return diff >= 0 ? diff : null
}

export default function Bar() {
  const { orders, setOrders, products } = useStore()
  const [, tick] = useState(0)

  // cập nhật số phút chờ mỗi 30 giây
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const name = (id: number) => products.find((p) => p.id === id)?.name ?? 'Món đã xoá'
  const move = (id: string, status: OrderStatus) =>
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)))

  const open = orders.filter((o) => o.status === 'Chờ pha chế' || o.status === 'Đang pha')

  return (
    <>
      <Head title="Pha chế" sub={`${open.length} đơn cần xử lý`} />
      <div className="grid2 even">
        {cols.map((c) => {
          const list = orders
            .filter((o) => o.status === c.status)
            .sort((a, b) => a.time.localeCompare(b.time)) // đơn cũ nhất lên trước
          return (
            <section className="card" key={c.status}>
              <h3>{c.title} ({list.length})</h3>
              {list.length === 0 && <p className="empty">Không có đơn nào.</p>}
              {list.map((o) => {
                const w = waited(o.time)
                const late = w !== null && w >= 10
                return (
                  <div key={o.id} style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <b>{o.id} · {o.table}</b>
                      <span className={late ? 'ov-warn' : ''}>
                        {o.time}{w !== null ? ` · ${w} phút` : ''}
                      </span>
                    </div>
                    <ul className="rank">
                      {o.lines.map((l) => (
                        <li key={l.id}>{name(l.id)}<span>x{l.qty}</span></li>
                      ))}
                    </ul>
                    <div className="acts" style={{ marginTop: 8 }}>
                      <button className="btn sm pri" onClick={() => move(o.id, c.to)}>{c.btn}</button>
                    </div>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </>
  )
}