import { useState } from 'react'
import { useStore } from '../store'
import type { OrderLine, PayMethod } from '../data'
import { Head, Modal, vnd } from '../ui'

const quick = [50000, 100000, 200000, 500000]

export default function Pos() {
  const { products, tables, orders, setOrders, addOrder } = useStore()
  const [cat, setCat] = useState('Tất cả')
  const [q, setQ] = useState('')
  const [cart, setCart] = useState<OrderLine[]>([])
  const [table, setTable] = useState('Mang đi')
  const [msg, setMsg] = useState('')

  // thanh toán ngay
  const [paying, setPaying] = useState(false)
  const [method, setMethod] = useState<PayMethod>('Tiền mặt')
  const [given, setGiven] = useState('')
  const [busy, setBusy] = useState(false)

  const cats = ['Tất cả', ...new Set(products.map((p) => p.cat))]
  const list = products.filter((p) => p.active && (cat === 'Tất cả' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()))
  const info = (id: number) => products.find((p) => p.id === id)
  const total = cart.reduce((s, l) => s + (info(l.id)?.price ?? 0) * l.qty, 0)

  const givenNum = Number(given) || 0
  const change = givenNum - total
  const canPay = method === 'Chuyển khoản' || givenNum >= total

  const add = (id: number) => {
    setMsg('')
    setCart((c) => (c.some((l) => l.id === id) ? c.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { id, qty: 1 }]))
  }
  const dec = (id: number) => setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0))

  // pay = undefined: chỉ tạo đơn (trả sau); có pay: tạo đơn và đánh dấu đã thanh toán
  const submit = async (pay?: PayMethod) => {
    if (busy) return
    setBusy(true)
    const before = new Set(orders.map((o) => o.id))
    const ok = await addOrder(table, cart)
    setBusy(false)
    if (!ok) return
    if (pay) {
      // đánh dấu đơn vừa tạo (đơn mới, đúng bàn, chưa thanh toán)
      setOrders((o) => o.map((x) => (!before.has(x.id) && x.table === table && !x.paid ? { ...x, paid: true, payMethod: pay } : x)))
    }
    setCart([])
    setPaying(false)
    setMsg(pay ? `Đã tạo đơn và thanh toán (${pay}) cho ${table}` : `Đã tạo đơn cho ${table}`)
  }

  const openPay = () => {
    setMethod('Tiền mặt')
    setGiven('')
    setPaying(true)
  }

  return (
    <>
      <Head title="Bán hàng" sub="Chọn món và tạo đơn cho khách" />
      <div className="pos">
        <section>
          <div className="toolbar">
            <input placeholder="Tìm món..." value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="chips">
              {cats.map((c) => <button key={c} className={'chip' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
            </div>
          </div>
          <div className="items">
            {list.map((p) => (
              <button key={p.id} className="item" onClick={() => add(p.id)}>
                <b>{p.name}</b><small>{p.cat}</small><span>{vnd(p.price)}</span>
              </button>
            ))}
          </div>
          {list.length === 0 && <p className="empty">Không có món nào khớp.</p>}
        </section>
        <aside className="card cart">
          <h3>Đơn hiện tại</h3>
          <select value={table} onChange={(e) => setTable(e.target.value)} aria-label="Chọn bàn">
            <option>Mang đi</option>
            {tables.map((t) => <option key={t.id}>{t.name}</option>)}
          </select>
          <div>
            {cart.length === 0 && <p className="empty">Chạm vào món để thêm vào đơn.</p>}
            {cart.map((l) => (
              <div key={l.id} className="line">
                <span>{info(l.id)?.name}</span>
                <div className="qty">
                  <button onClick={() => dec(l.id)} aria-label="Giảm">−</button>{l.qty}
                  <button onClick={() => add(l.id)} aria-label="Tăng">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="total"><span>Tổng cộng</span><span>{vnd(total)}</span></div>
          <button className="btn pri" disabled={!cart.length || busy} onClick={openPay}>Thanh toán ngay</button>
          <button className="btn" disabled={!cart.length || busy} onClick={() => submit()}>Tạo đơn (trả sau)</button>
          {msg && <p className="note">{msg}</p>}
        </aside>
      </div>

      {paying && (
        <Modal title={`Thanh toán - ${table}`} onClose={() => setPaying(false)}>
          <ul className="rank">
            {cart.map((l) => (
              <li key={l.id}>
                <span>{info(l.id)?.name} <small>x{l.qty}</small></span>
                <span>{vnd((info(l.id)?.price ?? 0) * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="total" style={{ marginTop: 14 }}><span>Cần thanh toán</span><span>{vnd(total)}</span></div>

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
                <button className="chip" onClick={() => setGiven(String(total))}>Đủ tiền</button>
                {quick.map((n) => (
                  <button key={n} className="chip" onClick={() => setGiven(String(n))}>{vnd(n)}</button>
                ))}
              </div>
              <div className="total" style={{ marginTop: 14 }}>
                <span>Tiền thối</span>
                <span className={givenNum && change < 0 ? 'ov-warn' : ''}>
                  {givenNum ? (change >= 0 ? vnd(change) : 'Chưa đủ tiền') : '—'}
                </span>
              </div>
            </>
          )}

          <div className="acts" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => setPaying(false)}>Đóng</button>
            <button className="btn pri" disabled={!canPay || busy} onClick={() => submit(method)}>
              {busy ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}