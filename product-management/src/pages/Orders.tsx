import { useState } from 'react'
import { useStore } from '../store'
import { priceOf } from '../data'
import type { Order, OrderStatus, PayMethod } from '../data'
import { Badge, Head, Modal, tone, vnd } from '../ui'

const next: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  'Chờ pha chế': { to: 'Đang pha', label: 'Bắt đầu pha' },
  'Đang pha': { to: 'Hoàn thành', label: 'Hoàn thành' },
}
const tabs = ['Tất cả', 'Chờ pha chế', 'Đang pha', 'Hoàn thành', 'Chưa thanh toán', 'Đã huỷ']
const reasons = ['Khách đổi ý', 'Hết nguyên liệu', 'Nhập sai đơn', 'Khách chờ quá lâu']
const quick = [50000, 100000, 200000, 500000]

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export default function Orders() {
  const { orders, setOrders, products } = useStore()
  const [tab, setTab] = useState('Tất cả')
  const [view, setView] = useState<Order | null>(null)

  // thanh toán
  const [pay, setPay] = useState<Order | null>(null)
  const [method, setMethod] = useState<PayMethod>('Tiền mặt')
  const [given, setGiven] = useState('')

  // huỷ đơn
  const [cancel, setCancel] = useState<Order | null>(null)
  const [reason, setReason] = useState('')

  const patch = (id: string, p: Partial<Order>) =>
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const set = (id: string, status: OrderStatus) => patch(id, { status })

  const list = orders.filter((o) => {
    if (tab === 'Tất cả') return true
    if (tab === 'Chưa thanh toán') return !o.paid && o.status !== 'Đã huỷ'
    return o.status === tab
  })
  const name = (id: number) => products.find((p) => p.id === id)?.name ?? 'Món đã xoá'

  // ---- thanh toán ----
  const openPay = (o: Order) => {
    setPay(o)
    setMethod(o.payMethod ?? 'Tiền mặt') // mặc định theo cách khách đã chọn khi đặt
    setGiven('')
  }
  const givenNum = Number(given) || 0
  const change = pay ? givenNum - pay.total : 0
  const canPay = pay ? method === 'Chuyển khoản' || givenNum >= pay.total : false
  const confirmPay = () => {
    if (!pay || !canPay) return
    patch(pay.id, { paid: true, payMethod: method })
    setPay(null)
    setView(null)
  }

  // ---- huỷ đơn ----
  const openCancel = (o: Order) => {
    setCancel(o)
    setReason('')
  }
  const confirmCancel = () => {
    if (!cancel || !reason.trim()) return
    patch(cancel.id, { status: 'Đã huỷ', cancelReason: reason.trim() })
    setCancel(null)
  }

  // ---- in hoá đơn ----
  const printBill = (o: Order) => {
    const w = window.open('', '_blank', 'width=380,height=640')
    if (!w) return
    const rows = o.lines
      .map((l) => {
        const price = priceOf(products, l.id)
        return `<tr><td>${esc(name(l.id))}<br><small>${l.qty} x ${vnd(price)}</small></td><td style="text-align:right">${vnd(price * l.qty)}</td></tr>`
      })
      .join('')
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Hoá đơn ${esc(o.id)}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:13px;margin:16px;color:#222}
        h2{text-align:center;margin:0 0 2px}
        p{margin:2px 0}
        .c{text-align:center}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        td{padding:5px 0;border-bottom:1px dashed #bbb;vertical-align:top}
        .t{display:flex;justify-content:space-between;font-weight:bold;font-size:15px;margin-top:8px}
      </style></head><body>
      <h2>Hạt Coffee House</h2>
      <p class="c">HOÁ ĐƠN</p>
      <p>Mã đơn: ${esc(o.id)}</p>
      <p>Bàn: ${esc(o.table)} · Giờ: ${esc(o.time)}</p>
      <p>Nhân viên: ${esc(o.staff)}</p>
      <table>${rows}</table>
      <div class="t"><span>Tổng cộng</span><span>${vnd(o.total)}</span></div>
      <p style="margin-top:8px">Thanh toán: ${o.paid ? esc(o.payMethod ?? 'Đã thanh toán') : 'Chưa thanh toán'}</p>
      <p class="c" style="margin-top:14px">Cảm ơn quý khách!</p>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <>
      <Head title="Đơn hàng" sub={`${orders.length} đơn trong ngày`} />
      <div className="toolbar chips">
        {tabs.map((t) => <button key={t} className={'chip' + (t === tab ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <section className="card wrap">
        <table>
          <thead>
            <tr><th>Mã</th><th>Bàn</th><th>Giờ</th><th>Nhân viên</th><th>Trạng thái</th><th>Thanh toán</th><th className="r">Tổng</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td><td>{o.table}</td><td>{o.time}</td><td>{o.staff}</td>
                <td><Badge tone={tone(o.status)}>{o.status}</Badge></td>
                <td>
                  {o.status === 'Đã huỷ'
                    ? '—'
                    : o.paid
                      ? <Badge tone={tone('Hoàn thành')}>{o.payMethod ?? 'Đã thanh toán'}</Badge>
                      : <Badge tone={tone('Chờ pha chế')}>Chưa thanh toán</Badge>}
                </td>
                <td className="r">{vnd(o.total)}</td>
                <td className="acts">
                  <button className="btn sm" onClick={() => setView(o)}>Chi tiết</button>
                  {next[o.status] && <button className="btn sm pri" onClick={() => set(o.id, next[o.status]!.to)}>{next[o.status]!.label}</button>}
                  {o.status !== 'Đã huỷ' && !o.paid && <button className="btn sm pri" onClick={() => openPay(o)}>Thanh toán</button>}
                  {(o.status === 'Chờ pha chế' || o.status === 'Đang pha') && <button className="btn sm del" onClick={() => openCancel(o)}>Huỷ</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="empty">Chưa có đơn nào ở mục này.</p>}
      </section>

      {view && (
        <Modal title={`Đơn ${view.id} - ${view.table}`} onClose={() => setView(null)}>
          <ul className="rank">
            {view.lines.map((l) => {
              const price = priceOf(products, l.id)
              return (
                <li key={l.id}>
                  <span>{name(l.id)} <small>({vnd(price)} x {l.qty})</small></span>
                  <span>{vnd(price * l.qty)}</span>
                </li>
              )
            })}
          </ul>
          <div className="total" style={{ marginTop: 14 }}><span>Tổng cộng</span><span>{vnd(view.total)}</span></div>

          <div className="od-info">
            <div><span>Số lượng món</span><b>{view.lines.reduce((n, l) => n + l.qty, 0)} món</b></div>
            {(view.customer || view.phone) && (
              <div><span>Khách hàng</span><b>{[view.customer, view.phone].filter(Boolean).join(' · ')}</b></div>
            )}
            <div><span>Phương thức thanh toán</span><b>{view.payMethod ?? 'Tiền mặt'}</b></div>
            <div>
              <span>Trạng thái thanh toán</span>
              <b>{view.status === 'Đã huỷ' ? 'Đơn đã huỷ' : view.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</b>
            </div>
            <div><span>Ghi chú của khách</span><b className="od-note">{view.note?.trim() || 'Không có ghi chú'}</b></div>
            {view.status === 'Đã huỷ' && <div><span>Lý do huỷ</span><b>{view.cancelReason || '—'}</b></div>}
          </div>
          <div className="acts" style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => printBill(view)}>In hoá đơn</button>
            {view.status !== 'Đã huỷ' && !view.paid && (
              <button className="btn pri" onClick={() => { const o = view; setView(null); openPay(o) }}>Thanh toán</button>
            )}
          </div>
        </Modal>
      )}

      {pay && (
        <Modal title={`Thanh toán đơn ${pay.id} - ${pay.table}`} onClose={() => setPay(null)}>
          <div className="total"><span>Cần thanh toán</span><span>{vnd(pay.total)}</span></div>

          <div className="toolbar chips" style={{ marginTop: 14 }}>
            {(['Tiền mặt', 'Chuyển khoản'] as const).map((m) => (
              <button key={m} className={'chip' + (m === method ? ' on' : '')} onClick={() => setMethod(m)}>{m}</button>
            ))}
          </div>

          {method === 'Tiền mặt' && (
            <>
              <label style={{ display: 'block', marginTop: 14 }}>
                Tiền khách đưa
                <input
                  type="number"
                  min={0}
                  value={given}
                  onChange={(e) => setGiven(e.target.value)}
                  placeholder="Nhập số tiền"
                  style={{ display: 'block', width: '100%', marginTop: 6 }}
                />
              </label>
              <div className="toolbar chips" style={{ marginTop: 10 }}>
                <button className="chip" onClick={() => setGiven(String(pay.total))}>Đủ tiền</button>
                {quick.map((q) => (
                  <button key={q} className="chip" onClick={() => setGiven(String(q))}>{vnd(q)}</button>
                ))}
              </div>
              <div className="total" style={{ marginTop: 14 }}>
                <span>Tiền thối</span>
                <span className={change < 0 ? 'ov-warn' : ''}>{givenNum ? (change >= 0 ? vnd(change) : 'Chưa đủ tiền') : '—'}</span>
              </div>
            </>
          )}

          <div className="acts" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => setPay(null)}>Đóng</button>
            <button className="btn pri" disabled={!canPay} onClick={confirmPay}>Xác nhận thanh toán</button>
          </div>
        </Modal>
      )}

      {cancel && (
        <Modal title={`Huỷ đơn ${cancel.id} - ${cancel.table}`} onClose={() => setCancel(null)}>
          <p>Chọn hoặc nhập lý do huỷ đơn:</p>
          <div className="toolbar chips" style={{ marginTop: 10 }}>
            {reasons.map((r) => (
              <button key={r} className={'chip' + (r === reason ? ' on' : '')} onClick={() => setReason(r)}>{r}</button>
            ))}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do khác..."
            style={{ display: 'block', width: '100%', marginTop: 10 }}
          />
          <div className="acts" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => setCancel(null)}>Không huỷ</button>
            <button className="btn del" disabled={!reason.trim()} onClick={confirmCancel}>Xác nhận huỷ</button>
          </div>
        </Modal>
      )}
    </>
  )
}