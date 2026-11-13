import { useEffect, useState } from 'react'
import { call, saved, useAuth } from '../auth'
import { Head, vnd } from '../ui'

type Top = { name: string; qty: number }
type Today = {
  ordersToday: number; pendingOrders: number; completedOrders: number
  statusToday: { waiting: number; making: number; done: number; cancelled: number }
  ordersByHour: { hour: number; orders: number }[]
  ordersByDay: { date: string; orders: number }[]
  tablesBusy: number; tablesTotal: number
  lowStock: { name: string; qty: number; unit: string; min: number }[]
  pendingList: { id: string; table: string; time: string; status: string; items: number }[]
  topProducts: Top[]; topProducts7Days: Top[]
}
type Rev = {
  revenueToday: number; revenue7Days: number; revenue30Days: number
  ordersCompleted30Days: number; staffCount: number
  revenueByDay: { date: string; revenue: number }[]
  revenueByStaff: { name: string; revenue: number; orders: number }[]
  topProducts: Top[]
}

const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

// Biểu đồ cột: mỗi cột có số ở trên, nhãn ở dưới
function Columns({ data, tip }: { data: { l: string; v: number }[]; tip?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.v))
  return (
    <div className="ov-bars">
      {data.map((d) => (
        <div className="ov-col" key={d.l} title={tip ? tip(d.v) : String(d.v)}>
          <b>{d.v > 0 ? d.v : ''}</b>
          <div className="ov-track"><i className={d.v === 0 ? 'zero' : ''} style={{ height: (d.v / max) * 100 + '%' }} /></div>
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
    <div className="ov-donut-wrap">
      <div className="ov-donut" style={{ background: total ? `conic-gradient(${stops.join(',')})` : 'var(--line)' }}>
        <div><b>{total}</b><small>đơn</small></div>
      </div>
      <ul className="ov-legend">
        {parts.map((p) => (
          <li key={p.label}><i style={{ background: p.color }} />{p.label}<span>{p.v}</span></li>
        ))}
      </ul>
    </div>
  )
}

function HBars({ list, unit = 'ly' }: { list: Top[]; unit?: string }) {
  const max = Math.max(1, ...list.map((p) => p.qty))
  return (
    <ul className="ov-hbars">
      {list.map((p) => (
        <li key={p.name}>
          <div><span>{p.name}</span><b>{p.qty} {unit}</b></div>
          <div className="ov-meter"><i style={{ width: (p.qty / max) * 100 + '%' }} /></div>
        </li>
      ))}
    </ul>
  )
}

export default function Overview() {
  const { user } = useAuth()
  const owner = user?.role === 'owner'
  const [today, setToday] = useState<Today | null>(null)
  const [rev, setRev] = useState<Rev | null>(null)
  const [err, setErr] = useState('')
  const [range, setRange] = useState<'today' | 'week'>('today')
  const [at, setAt] = useState('')

  useEffect(() => {
    const t = saved()
    const load = () => {
      call<Today>('/admin/stats/today', 'GET', undefined, t)
        .then((d) => {
          setToday(d)
          setErr('')
          setAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }))
        })
        .catch((e) => setErr(e.message))
      if (owner) call<Rev>('/admin/stats/revenue', 'GET', undefined, t).then(setRev).catch((e) => setErr(e.message))
    }
    load()
    const timer = setInterval(load, 30000) // tự cập nhật mỗi 30 giây
    return () => clearInterval(timer)
  }, [owner])

  // khung giờ hiển thị: 6h–22h, mở rộng nếu có đơn ngoài khung này
  // mỗi giờ chỉ ra đúng 1 cột, nhãn luôn là chuỗi dạng "4h"
  const hours = (() => {
    if (!today) return []
    const byHour = new Map<number, number>()
    for (const h of today.ordersByHour) {
      const hr = Number(h.hour)
      if (Number.isNaN(hr)) continue
      byHour.set(hr, (byHour.get(hr) ?? 0) + Number(h.orders || 0))
    }
    const used = [...byHour].filter(([, n]) => n > 0).map(([hr]) => hr)
    const from = Math.min(6, ...used)
    const to = Math.max(22, ...used)
    const list: { l: string; v: number }[] = []
    for (let hr = from; hr <= to; hr++) list.push({ l: `${hr}h`, v: byHour.get(hr) ?? 0 })
    return list
  })()

  const revMax = Math.max(1, ...(rev?.revenueByDay.map((d) => d.revenue) ?? [1]))
  const top = today ? (range === 'today' ? today.topProducts : today.topProducts7Days) : []
  const week7 = today ? today.ordersByDay.reduce((s, d) => s + d.orders, 0) : 0

  return (
    <>
      <Head
        title="Tổng quan"
        sub={(owner ? 'Tình hình kinh doanh của quán' : 'Công việc hôm nay') + (at ? ` · cập nhật lúc ${at}` : '')}
      />
      {err && <p className="ad-err">{err}</p>}
      {!today && !err && <p className="empty">Đang tải số liệu...</p>}

      <div className="stats ov-stats">
        {owner && rev && (
          <>
            <div className="card stat"><span>Doanh thu hôm nay</span><b>{vnd(rev.revenueToday)}</b></div>
            <div className="card stat"><span>Doanh thu 7 ngày</span><b>{vnd(rev.revenue7Days)}</b></div>
            <div className="card stat"><span>Doanh thu 30 ngày</span><b>{vnd(rev.revenue30Days)}</b></div>
            <div className="card stat"><span>Nhân viên đang làm</span><b>{rev.staffCount}</b></div>
          </>
        )}
        {today && (
          <>
            <div className="card stat"><span>Đơn hôm nay</span><b>{today.ordersToday}</b></div>
            <div className="card stat"><span>Đơn đang chờ</span><b className={today.pendingOrders > 0 ? 'ov-warn' : ''}>{today.pendingOrders}</b></div>
            <div className="card stat"><span>Đơn hoàn thành</span><b>{today.completedOrders}</b></div>
            <div className="card stat"><span>Bàn có khách</span><b>{today.tablesBusy}/{today.tablesTotal}</b></div>
            <div className="card stat"><span>Nguyên liệu sắp hết</span><b className={today.lowStock.length > 0 ? 'ov-warn' : ''}>{today.lowStock.length}</b></div>
            <div className="card stat"><span>Đơn 7 ngày qua</span><b>{week7}</b></div>
          </>
        )}
      </div>

      {today && (
        <>
          <div className="grid2 even">
            <section className="card">
              <h3>Số đơn theo giờ hôm nay</h3>
              {today.ordersToday === 0 ? <p className="empty">Hôm nay chưa có đơn nào.</p> : <Columns data={hours} tip={(v) => v + ' đơn'} />}
            </section>
            <section className="card">
              <h3>Trạng thái đơn hôm nay</h3>
              <Donut
                parts={[
                  { label: 'Chờ pha chế', v: today.statusToday.waiting, color: '#B8A99A' },
                  { label: 'Đang pha', v: today.statusToday.making, color: '#D49A3A' },
                  { label: 'Hoàn thành', v: today.statusToday.done, color: '#2F6B57' },
                  { label: 'Đã huỷ', v: today.statusToday.cancelled, color: '#B3382C' },
                ]}
              />
            </section>
          </div>

          <div className="grid2 even">
            <section className="card">
              <h3>Số đơn 7 ngày gần nhất</h3>
              <Columns data={today.ordersByDay.map((d) => ({ l: dm(d.date), v: d.orders }))} tip={(v) => v + ' đơn'} />
            </section>
            <section className="card">
              <div className="ov-h">
                <h3>Món bán chạy</h3>
                <div className="ov-tabs">
                  <button className={range === 'today' ? 'on' : ''} onClick={() => setRange('today')}>Hôm nay</button>
                  <button className={range === 'week' ? 'on' : ''} onClick={() => setRange('week')}>7 ngày</button>
                </div>
              </div>
              {top.length === 0 ? <p className="empty">Chưa có dữ liệu.</p> : <HBars list={top} />}
            </section>
          </div>

          <div className="grid2 even">
            <section className="card">
              <div className="ov-h"><h3>Đơn đang chờ xử lý</h3><a href="#/don-hang">Xem đơn hàng →</a></div>
              {today.pendingList.length === 0 ? <p className="empty">Không có đơn nào đang chờ.</p> : (
                <ul className="rank">
                  {today.pendingList.map((o) => (
                    <li key={o.id}>
                      <span className="ov-ink"><b>{o.id}</b> · {o.table} · {o.items} món</span>
                      <span>{o.time} · {o.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card">
              <div className="ov-h"><h3>Nguyên liệu sắp hết</h3><a href="#/kho">Xem kho →</a></div>
              {today.lowStock.length === 0 ? <p className="empty">Kho đang đủ hàng.</p> : (
                <ul className="rank">
                  {today.lowStock.map((s) => (
                    <li key={s.name}><span className="ov-ink">{s.name}</span><span className="ov-warn">còn {s.qty} {s.unit} (tối thiểu {s.min})</span></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {owner && rev && (
        <>
          <section className="card">
            <h3>Doanh thu 7 ngày gần nhất</h3>
            <div className="ov-bars">
              {rev.revenueByDay.map((d) => (
                <div className="ov-col" key={d.date} title={vnd(d.revenue)}>
                  <b>{d.revenue > 0 ? Math.round(d.revenue / 1000) + 'k' : ''}</b>
                  <div className="ov-track"><i className={d.revenue === 0 ? 'zero' : ''} style={{ height: (d.revenue / revMax) * 100 + '%' }} /></div>
                  <small>{dm(d.date)}</small>
                </div>
              ))}
            </div>
          </section>
          <section className="card wrap" style={{ marginTop: 14 }}>
            <h3>Doanh thu theo nhân viên (7 ngày)</h3>
            {rev.revenueByStaff.length === 0 ? <p className="empty">Chưa có đơn hoàn thành.</p> : (
              <table>
                <thead><tr><th>Nhân viên</th><th>Số đơn</th><th className="r">Doanh thu</th></tr></thead>
                <tbody>
                  {rev.revenueByStaff.map((s) => (
                    <tr key={s.name}><td>{s.name}</td><td>{s.orders}</td><td className="r">{vnd(s.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  )
}