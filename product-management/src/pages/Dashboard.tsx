import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import type { Order } from '../data'
import { useStore } from '../store'
import { Badge, Head, tone, vnd } from '../ui'
import './dashboard.css'

type O = Order & { createdAt?: string } // createdAt do back end trả về
type Bar = { l: string; v: number }

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayLabel = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
const sum = (list: O[]) => list.reduce((s, o) => s + o.total, 0)
const whenOf = (o: O) => (o.createdAt ? new Date(o.createdAt) : new Date())
const k = (v: number) => (v > 0 ? Math.round(v / 1000) + 'k' : '')

// Biểu đồ cột: số ở trên, nhãn ở dưới
function Columns({ data, fmt = (v) => (v > 0 ? String(v) : ''), tip }: { data: Bar[]; fmt?: (v: number) => string; tip?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.v))
  return (
    <div className="dh-bars">
      {data.map((d) => (
        <div className="dh-col" key={d.l} title={tip ? tip(d.v) : String(d.v)}>
          <b>{fmt(d.v)}</b>
          <div className="dh-track">
            <i className={d.v === 0 ? 'zero' : ''} style={{ height: (d.v / max) * 100 + '%' }} />
          </div>
          <small>{d.l}</small>
        </div>
      ))}
    </div>
  )
}

// Biểu đồ tròn theo trạng thái đơn
function Donut({ parts }: { parts: { label: string; v: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.v, 0)
  let acc = 0
  const stops = parts
    .filter((p) => p.v > 0)
    .map((p) => {
      const from = (acc / total) * 100
      acc += p.v
      return `${p.color} ${from}% ${(acc / total) * 100}%`
    })
  return (
    <div className="dh-donut-wrap">
      <div className="dh-donut" style={{ background: total ? `conic-gradient(${stops.join(',')})` : '#e6dfd5' }}>
        <div>
          <b>{total}</b>
          <small>đơn</small>
        </div>
      </div>
      <ul className="dh-legend">
        {parts.map((p) => (
          <li key={p.label}>
            <i style={{ background: p.color }} />
            {p.label}
            <span>{p.v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Dashboard() {
  const { orders, tables, stock, products } = useStore()
  const { user } = useAuth()
  // chủ quán (hoặc chưa có phân quyền) thấy doanh thu; nhân viên chỉ thấy số đơn
  const role = (user as unknown as { role?: string } | null)?.role
  const owner = role === undefined || role === 'owner'
  const [range, setRange] = useState<'today' | 'week' | 'all'>('today')

  // tự tính lại giờ / qua ngày mới mỗi 30 giây
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const list = orders as O[]
  const now = new Date()
  const todayKey = dayKey(now)
  const done = (o: O) => o.status === 'Hoàn thành'

  const today = list.filter((o) => dayKey(whenOf(o)) === todayKey)
  const revenueToday = sum(today.filter(done))
  const pending = list.filter((o) => o.status === 'Chờ pha chế' || o.status === 'Đang pha').length
  const busy = tables.filter((t) => t.status === 'Có khách').length
  const low = stock.filter((s) => s.qty <= s.min)

  // 7 ngày gần nhất
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    const inDay = list.filter((o) => dayKey(whenOf(o)) === dayKey(d))
    return { l: dayLabel(d), orders: inDay.length, revenue: sum(inDay.filter(done)) }
  })
  const revenue7 = byDay.reduce((s, d) => s + d.revenue, 0)
  const orders7 = byDay.reduce((s, d) => s + d.orders, 0)
  const diff = today.length - byDay[5].orders // byDay[5] là hôm qua

  // đơn theo giờ (6h–22h, mở rộng nếu có đơn ngoài khung)
  const used = today.map((o) => parseInt(o.time)).filter((h) => !isNaN(h))
  const from = Math.min(6, ...used)
  const to = Math.max(22, ...used)
  const hours: Bar[] = Array.from({ length: to - from + 1 }, (_, i) => ({
    l: from + i + 'h',
    v: used.filter((h) => h === from + i).length,
  }))

  const count = (s: O['status']) => today.filter((o) => o.status === s).length

  // món bán chạy
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - 6)

  const topFrom = (src: O[]) => {
    const m = new Map<number, number>()
    src
      .filter((o) => o.status !== 'Đã huỷ')
      .forEach((o) => o.lines.forEach((l) => m.set(l.id, (m.get(l.id) ?? 0) + l.qty)))
    return [...m]
      .map(([id, qty]) => ({ name: products.find((p) => p.id === id)?.name ?? 'Món đã xoá', qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }
  const topToday = topFrom(today)
  const topWeek = topFrom(list.filter((o) => whenOf(o) >= weekStart))
  const topAll = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5).map((p) => ({ name: p.name, qty: p.sold }))
  const top = range === 'today' ? topToday : range === 'week' ? topWeek : topAll
  const topMax = Math.max(1, ...top.map((p) => p.qty))

  // doanh thu theo nhân viên (tháng này) - chỉ chủ quán
  const monthOrders = list.filter((o) => {
    const d = whenOf(o)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const revenueMonth = sum(monthOrders.filter(done))
  const staffRows = Object.values(
    monthOrders.reduce<Record<string, { name: string; orders: number; done: number; revenue: number }>>((acc, o) => {
      const r = (acc[o.staff] ??= { name: o.staff, orders: 0, done: 0, revenue: 0 })
      r.orders += 1
      if (done(o)) {
        r.done += 1
        r.revenue += o.total
      }
      return acc
    }, {}),
  ).sort((a, b) => b.revenue - a.revenue)

  const dateText = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeText = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <Head
        title="Tổng quan"
        sub={(owner ? 'Tình hình kinh doanh của quán' : 'Công việc hôm nay') + ' · ' + dateText + ' · cập nhật lúc ' + timeText}
      />

      <div className="dh-stats">
        {owner && (
          <>
            <div className="card stat"><span>Doanh thu hôm nay</span><b>{vnd(revenueToday)}</b></div>
            <div className="card stat"><span>Doanh thu 7 ngày</span><b>{vnd(revenue7)}</b></div>
            <div className="card stat"><span>Doanh thu tháng này</span><b>{vnd(revenueMonth)}</b></div>
          </>
        )}
        <div className="card stat">
          <span>Đơn hôm nay</span>
          <b>{today.length}</b>
          <small className={diff >= 0 ? 'dh-up' : 'dh-down'}>
            {diff === 0 ? 'Bằng hôm qua' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} so với hôm qua`}
          </small>
        </div>
        <div className="card stat"><span>Đơn đang chờ</span><b className={pending > 0 ? 'dh-warn' : ''}>{pending}</b></div>
        {!owner && <div className="card stat"><span>Đơn hoàn thành hôm nay</span><b>{count('Hoàn thành')}</b></div>}
        <div className="card stat"><span>Bàn có khách</span><b>{busy}/{tables.length}</b></div>
        <div className="card stat"><span>Nguyên liệu sắp hết</span><b className={low.length > 0 ? 'dh-warn' : ''}>{low.length}</b></div>
        {!owner && <div className="card stat"><span>Đơn 7 ngày qua</span><b>{orders7}</b></div>}
      </div>

      <div className="dh-grid">
        <section className="card">
          <h3>Số đơn theo giờ hôm nay</h3>
          {today.length === 0 ? <p className="empty">Hôm nay chưa có đơn nào.</p> : <Columns data={hours} tip={(v) => v + ' đơn'} />}
        </section>
        <section className="card">
          <h3>Trạng thái đơn hôm nay</h3>
          <Donut
            parts={[
              { label: 'Chờ pha chế', v: count('Chờ pha chế'), color: '#b8a99a' },
              { label: 'Đang pha', v: count('Đang pha'), color: '#d49a3a' },
              { label: 'Hoàn thành', v: count('Hoàn thành'), color: '#2f6b57' },
              { label: 'Đã huỷ', v: count('Đã huỷ'), color: '#b3382c' },
            ]}
          />
        </section>
      </div>

      <div className="dh-grid">
        <section className="card">
          <h3>{owner ? 'Doanh thu 7 ngày gần nhất' : 'Số đơn 7 ngày gần nhất'}</h3>
          {owner ? (
            <Columns data={byDay.map((d) => ({ l: d.l, v: d.revenue }))} fmt={k} tip={vnd} />
          ) : (
            <Columns data={byDay.map((d) => ({ l: d.l, v: d.orders }))} tip={(v) => v + ' đơn'} />
          )}
          <p className="dh-total">{owner ? `Tổng 7 ngày: ${vnd(revenue7)}` : `Tổng 7 ngày: ${orders7} đơn`}</p>
        </section>
        <section className="card">
          <div className="dh-h">
            <h3>Món bán chạy</h3>
            <div className="dh-tabs">
              <button className={range === 'today' ? 'on' : ''} onClick={() => setRange('today')}>Hôm nay</button>
              <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>7 ngày</button>
              <button className={range === 'all' ? 'on' : ''} onClick={() => setRange('all')}>Từ trước đến nay</button>
            </div>
          </div>
          {top.length === 0 ? (
            <p className="empty">Chưa có dữ liệu.</p>
          ) : (
            <ul className="dh-hbars">
              {top.map((p) => (
                <li key={p.name}>
                  <div><span>{p.name}</span><b>{p.qty} ly</b></div>
                  <div className="dh-meter"><i style={{ width: (p.qty / topMax) * 100 + '%' }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dh-grid">
        <section className="card wrap">
          <div className="dh-h">
            <h3>Đơn mới nhất</h3>
            <a href="#/don-hang">Xem tất cả →</a>
          </div>
          <table>
            <thead><tr><th>Mã</th><th>Bàn</th><th>Giờ</th><th>Trạng thái</th><th className="r">Tổng</th></tr></thead>
            <tbody>
              {list.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td><td>{o.table}</td><td>{o.time}</td>
                  <td><Badge tone={tone(o.status)}>{o.status}</Badge></td>
                  <td className="r">{vnd(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h3>Cần nhập thêm</h3>
          {low.length === 0 ? (
            <p className="empty">Kho đang đủ hàng.</p>
          ) : (
            <ul className="dh-hbars">
              {low.map((s) => (
                <li key={s.id}>
                  <div><span>{s.name}</span><b className="dh-warn">còn {s.qty} {s.unit}</b></div>
                  <div className="dh-meter warn"><i style={{ width: Math.min(100, (s.qty / Math.max(1, s.min)) * 100) + '%' }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {owner && (
        <section className="card wrap">
          <h3>Doanh thu theo nhân viên (tháng này)</h3>
          {staffRows.length === 0 ? (
            <p className="empty">Tháng này chưa có đơn nào.</p>
          ) : (
            <table>
              <thead><tr><th>Nhân viên</th><th>Số đơn</th><th>Hoàn thành</th><th className="r">Doanh thu</th></tr></thead>
              <tbody>
                {staffRows.map((s) => (
                  <tr key={s.name}><td>{s.name}</td><td>{s.orders}</td><td>{s.done}</td><td className="r">{vnd(s.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  )
}