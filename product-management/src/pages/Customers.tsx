import { useMemo, useState } from 'react'
import { useStore } from '../store'
import type { Customer as C } from '../data'
import { Badge, Field, Head, Modal, vnd } from '../ui'

const blank: C = { id: 0, name: '', phone: '', visits: 0, spent: 0, last: '' }

// Hạng tự tính theo số lượt ghé (sửa mốc ở đây nếu muốn)
const rank = (c: C) => (c.visits >= 30 ? 'Thân thiết' : c.visits >= 10 ? 'Quen' : 'Mới')
const rankTone = (r: string) => (r === 'Thân thiết' ? 'ok' : r === 'Quen' ? 'warn' : 'mute')
const ranks = ['Thân thiết', 'Quen', 'Mới']
const rankColor: Record<string, string> = { 'Thân thiết': '#2F7D5B', Quen: '#E8A33D', Mới: '#B9B1A7' }

const today = () => new Date().toLocaleDateString('en-GB') // dd/mm/yyyy
const parse = (d: string) => {
  const [dd, mm, yy] = d.split('/').map(Number)
  return new Date(yy || 0, (mm || 1) - 1, dd || 1).getTime()
}
const daysAgo = (d: string) => (d ? Math.max(0, Math.floor((Date.now() - parse(d)) / 864e5)) : 999)
const nextRank = (c: C) =>
  c.visits < 10 ? { name: 'Quen', need: 10 } : c.visits < 30 ? { name: 'Thân thiết', need: 30 } : null
const initial = (n: string) => n.trim().split(' ').pop()?.[0]?.toUpperCase() ?? '?'

type Sort = 'spent' | 'visits' | 'name' | 'recent'

export default function Customers() {
  const { customers, setCustomers } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | string>('all')
  const [sort, setSort] = useState<Sort>('spent')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [edit, setEdit] = useState<C | null>(null)
  const [detail, setDetail] = useState<C | null>(null)
  const [visit, setVisit] = useState<{ c: C; amount: string } | null>(null)

  const totalSpent = customers.reduce((s, c) => s + c.spent, 0)
  const avg = customers.length ? Math.round(totalSpent / customers.length) : 0
  const count = (r: string) => customers.filter((c) => rank(c) === r).length
  const maxSpent = Math.max(1, ...customers.map((c) => c.spent))
  const top5 = [...customers].sort((a, b) => b.spent - a.spent).slice(0, 5)
  const care = customers
    .filter((c) => daysAgo(c.last) >= 14)
    .sort((a, b) => daysAgo(b.last) - daysAgo(a.last))
    .slice(0, 5)

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    const list = customers.filter(
      (c) =>
        (filter === 'all' || rank(c) === filter) &&
        (!k || c.name.toLowerCase().includes(k) || c.phone.replace(/\s/g, '').includes(k.replace(/\s/g, ''))),
    )
    if (sort === 'spent') list.sort((a, b) => b.spent - a.spent)
    else if (sort === 'visits') list.sort((a, b) => b.visits - a.visits)
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    else list.sort((a, b) => parse(b.last) - parse(a.last))
    return list
  }, [customers, q, filter, sort])

  const save = () => {
    if (!edit || !edit.name.trim()) return
    const item: C = {
      ...edit,
      name: edit.name.trim(),
      phone: edit.phone.trim(),
      visits: Math.max(0, Number(edit.visits) || 0),
      spent: Math.max(0, Number(edit.spent) || 0),
      last: edit.last || today(),
    }
    setCustomers((l) => (item.id === 0 ? [...l, { ...item, id: Date.now() }] : l.map((x) => (x.id === item.id ? item : x))))
    setEdit(null)
  }

  const remove = (c: C) => {
    if (!window.confirm(`Xoá khách hàng ${c.name}?`)) return
    setCustomers((l) => l.filter((x) => x.id !== c.id))
    setDetail(null)
  }

  const addVisit = () => {
    if (!visit) return
    const amount = Math.max(0, Number(visit.amount.replace(/\D/g, '')) || 0)
    setCustomers((l) =>
      l.map((x) => (x.id === visit.c.id ? { ...x, visits: x.visits + 1, spent: x.spent + amount, last: today() } : x)),
    )
    setDetail(null)
    setVisit(null)
  }

  const exportCsv = () => {
    const rows = [
      ['Khách hàng', 'Điện thoại', 'Hạng', 'Lượt ghé', 'Tổng chi tiêu', 'Lần cuối'],
      ...shown.map((c) => [c.name, c.phone, rank(c), c.visits, c.spent, c.last]),
    ]
    const csv = '\uFEFF' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'khach-hang.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copy = (t: string) => navigator.clipboard?.writeText(t)

  const dLive = detail ? customers.find((x) => x.id === detail.id) ?? detail : null
  const nxt = dLive ? nextRank(dLive) : null

  return (
    <>
      <Head
        title="Khách hàng"
        sub={`${customers.length} khách quen · ${shown.length} đang hiển thị`}
        action={
          <div className="acts">
            <button className="btn" onClick={exportCsv}>Xuất Excel</button>
            <button className="btn pri" onClick={() => setEdit({ ...blank, last: today() })}>Thêm khách</button>
          </div>
        }
      />

      <div className="stats">
        <div className="stat"><span>Tổng khách</span><b>{customers.length}</b></div>
        <div className="stat ok"><span>Khách thân thiết</span><b>{count('Thân thiết')}</b></div>
        <div className="stat"><span>Tổng chi tiêu</span><b>{vnd(totalSpent)}</b></div>
        <div className="stat warn"><span>Cần chăm sóc (14+ ngày)</span><b>{customers.filter((c) => daysAgo(c.last) >= 14).length}</b></div>
      </div>

      <div className="cust-layout">
        {/* ===== Cột trái: danh sách ===== */}
        <div className="cust-main">
          <div className="cust-bar">
            <input placeholder="Tìm theo tên hoặc số điện thoại..." value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="cust-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="spent">Chi tiêu nhiều nhất</option>
              <option value="visits">Ghé nhiều nhất</option>
              <option value="recent">Ghé gần đây</option>
              <option value="name">Tên A đến Z</option>
            </select>
            <div className="cust-view">
              <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')} title="Dạng bảng">☰</button>
              <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')} title="Dạng thẻ">▦</button>
            </div>
          </div>
          <div className="chips cust-chips">
            <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>Tất cả ({customers.length})</button>
            {ranks.map((r) => (
              <button key={r} className={'chip' + (filter === r ? ' on' : '')} onClick={() => setFilter(r)}>
                {r} ({count(r)})
              </button>
            ))}
          </div>

          {view === 'table' ? (
            <section className="card wrap">
              <table>
                <thead>
                  <tr><th>Khách hàng</th><th>Điện thoại</th><th>Hạng</th><th className="r">Lượt ghé</th><th className="r">Tổng chi tiêu</th><th>Lần cuối</th><th></th></tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button className="cust-name" onClick={() => setDetail(c)}>
                          <span className="avatar">{initial(c.name)}</span>{c.name}
                        </button>
                      </td>
                      <td>{c.phone}</td>
                      <td><Badge tone={rankTone(rank(c))}>{rank(c)}</Badge></td>
                      <td className="r">{c.visits}</td>
                      <td className="r">{vnd(c.spent)}</td>
                      <td>{c.last}{daysAgo(c.last) >= 14 && <em className="cust-late"> · {daysAgo(c.last)} ngày</em>}</td>
                      <td className="acts">
                        <button className="btn sm" onClick={() => setVisit({ c, amount: '' })}>+ Lượt ghé</button>
                        <button className="btn sm" onClick={() => setEdit(c)}>Sửa</button>
                        <button className="btn sm del" onClick={() => remove(c)}>Xoá</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shown.length === 0 && <p className="empty">Không tìm thấy khách nào khớp.</p>}
            </section>
          ) : (
            <>
              <div className="cust-cards">
                {shown.map((c) => (
                  <div className="ccard" key={c.id}>
                    <div className="ccard-top">
                      <span className="cav" style={{ background: rankColor[rank(c)] }}>{initial(c.name)}</span>
                      <div>
                        <button className="cust-name" onClick={() => setDetail(c)}>{c.name}</button>
                        <small>{c.phone}</small>
                      </div>
                      <Badge tone={rankTone(rank(c))}>{rank(c)}</Badge>
                    </div>
                    <div className="ccard-grid">
                      <div><span>Lượt ghé</span><b>{c.visits}</b></div>
                      <div><span>Chi tiêu</span><b>{vnd(c.spent)}</b></div>
                      <div><span>Lần cuối</span><b>{c.last || '—'}</b></div>
                    </div>
                    <div className="acts">
                      <button className="btn sm" onClick={() => setVisit({ c, amount: '' })}>+ Lượt ghé</button>
                      <button className="btn sm" onClick={() => setEdit(c)}>Sửa</button>
                      <button className="btn sm del" onClick={() => remove(c)}>Xoá</button>
                    </div>
                  </div>
                ))}
              </div>
              {shown.length === 0 && <p className="empty">Không tìm thấy khách nào khớp.</p>}
            </>
          )}
        </div>

        {/* ===== Cột phải: thống kê ===== */}
        <aside className="cust-side">
          <section className="card">
            <h3>Phân bổ hạng</h3>
            <div className="cust-dist">
              {ranks.map((r) => (
                <i key={r} style={{ flex: count(r) || 0.001, background: rankColor[r] }} title={`${r}: ${count(r)}`} />
              ))}
            </div>
            <ul className="cust-legend">
              {ranks.map((r) => (
                <li key={r}><i style={{ background: rankColor[r] }} />{r}<span>{count(r)}</span></li>
              ))}
            </ul>
            <p className="cust-note">Trung bình mỗi khách chi <b>{vnd(avg)}</b></p>
          </section>

          <section className="card">
            <h3>🏆 Top chi tiêu</h3>
            <ol className="cust-top">
              {top5.map((c, i) => (
                <li key={c.id} onClick={() => setDetail(c)}>
                  <span className="cust-pos">{i + 1}</span>
                  <div>
                    <b>{c.name}</b>
                    <div className="cust-bar2"><i style={{ width: `${(c.spent / maxSpent) * 100}%` }} /></div>
                  </div>
                  <em>{vnd(c.spent)}</em>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h3>💌 Cần chăm sóc</h3>
            {care.length === 0 ? (
              <p className="cust-note">Tất cả khách đều ghé trong 14 ngày gần đây.</p>
            ) : (
              <ul className="cust-care">
                {care.map((c) => (
                  <li key={c.id}>
                    <div>
                      <b>{c.name}</b>
                      <small>{daysAgo(c.last)} ngày chưa ghé</small>
                    </div>
                    <a className="btn sm" href={`tel:${c.phone.replace(/\s/g, '')}`}>Gọi</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* ===== Chi tiết khách ===== */}
      {dLive && (
        <Modal title="Thông tin khách hàng" onClose={() => setDetail(null)}>
          <div className="form">
            <div className="cdet-head">
              <span className="cav big" style={{ background: rankColor[rank(dLive)] }}>{initial(dLive.name)}</span>
              <div>
                <b>{dLive.name}</b>
                <div className="cdet-phone">
                  <a href={`tel:${dLive.phone.replace(/\s/g, '')}`}>{dLive.phone}</a>
                  <button className="btn sm" onClick={() => copy(dLive.phone)}>Sao chép</button>
                </div>
              </div>
              <Badge tone={rankTone(rank(dLive))}>{rank(dLive)}</Badge>
            </div>
            <div className="ccard-grid">
              <div><span>Lượt ghé</span><b>{dLive.visits}</b></div>
              <div><span>Tổng chi tiêu</span><b>{vnd(dLive.spent)}</b></div>
              <div><span>TB mỗi lượt</span><b>{vnd(dLive.visits ? Math.round(dLive.spent / dLive.visits) : 0)}</b></div>
            </div>
            <p className="cust-note">
              Lần cuối: <b>{dLive.last || '—'}</b>{dLive.last && ` (${daysAgo(dLive.last)} ngày trước)`}
            </p>
            {nxt ? (
              <div>
                <p className="cust-note">Còn <b>{nxt.need - dLive.visits}</b> lượt nữa để lên hạng <b>{nxt.name}</b></p>
                <div className="cust-bar2 lg"><i style={{ width: `${(dLive.visits / nxt.need) * 100}%` }} /></div>
              </div>
            ) : (
              <p className="cust-note">🎉 Khách đã đạt hạng cao nhất.</p>
            )}
            <div className="acts">
              <button className="btn del" onClick={() => remove(dLive)}>Xoá</button>
              <button className="btn" onClick={() => { const c = dLive; setDetail(null); setEdit(c) }}>Sửa</button>
              <button className="btn pri" onClick={() => setVisit({ c: dLive, amount: '' })}>+ Lượt ghé</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== Thêm / sửa ===== */}
      {edit && (
        <Modal title={edit.id === 0 ? 'Thêm khách hàng' : 'Sửa thông tin khách'} onClose={() => setEdit(null)}>
          <div className="form">
            <Field label="Họ tên"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
            <Field label="Điện thoại"><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Số lượt ghé"><input type="number" min={0} value={edit.visits} onChange={(e) => setEdit({ ...edit, visits: Number(e.target.value) })} /></Field>
            <Field label="Tổng chi tiêu (đ)"><input type="number" min={0} step={1000} value={edit.spent} onChange={(e) => setEdit({ ...edit, spent: Number(e.target.value) })} /></Field>
            <Field label="Lần cuối (dd/mm/yyyy)"><input value={edit.last} onChange={(e) => setEdit({ ...edit, last: e.target.value })} /></Field>
            <p className="cust-note">Hạng sau khi lưu: <b>{rank({ ...edit, visits: Number(edit.visits) || 0 })}</b></p>
            <div className="acts">
              <button className="btn" onClick={() => setEdit(null)}>Huỷ</button>
              <button className="btn pri" onClick={save}>Lưu</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===== Ghi nhận lượt ghé ===== */}
      {visit && (
        <Modal title={`Ghi nhận lượt ghé: ${visit.c.name}`} onClose={() => setVisit(null)}>
          <div className="form">
            <Field label="Số tiền khách chi lần này (đ)">
              <input
                inputMode="numeric"
                placeholder="Ví dụ: 65000"
                value={visit.amount}
                onChange={(e) => setVisit({ ...visit, amount: e.target.value })}
                autoFocus
              />
            </Field>
            <p className="cust-note">Sẽ cộng thêm 1 lượt ghé và cập nhật ngày ghé gần nhất là hôm nay.</p>
            <div className="acts">
              <button className="btn" onClick={() => setVisit(null)}>Huỷ</button>
              <button className="btn pri" onClick={addVisit}>Ghi nhận</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}