import { useState } from 'react'
import { useStore } from '../store'
import type { Table, TableStatus } from '../data'
import { Badge, Field, Head, Modal, tone } from '../ui'

const states: TableStatus[] = ['Trống', 'Có khách', 'Đã đặt']
const cls: Record<string, string> = { 'Trống': 'free', 'Có khách': 'busy', 'Đã đặt': 'booked' }
const blank: Table = { id: 0, name: '', seats: 4, status: 'Trống' }
const isOutdoor = (t: Table) => t.name.toLowerCase().includes('sân vườn')

export default function Tables() {
  const { tables, setTables } = useStore()
  const [edit, setEdit] = useState<Table | null>(null)
  const [filter, setFilter] = useState<'all' | TableStatus>('all')

  const count = (s: TableStatus) => tables.filter((t) => t.status === s).length
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0)
  const shown = tables.filter((t) => filter === 'all' || t.status === filter)

  const save = () => {
    if (!edit || !edit.name.trim()) return
    const seats = Math.max(1, Number(edit.seats) || 1)
    const item = { ...edit, name: edit.name.trim(), seats }
    setTables((l) => (item.id === 0 ? [...l, { ...item, id: Date.now() }] : l.map((x) => (x.id === item.id ? item : x))))
    setEdit(null)
  }
  const remove = () => {
    if (!edit || edit.id === 0) return
    if (!window.confirm(`Xoá ${edit.name}?`)) return
    setTables((l) => l.filter((x) => x.id !== edit.id))
    setEdit(null)
  }

  const zone = (title: string, icon: string, list: Table[]) =>
    list.length === 0 ? null : (
      <section className="zone">
        <div className="zone-h">
          <h3>{icon} {title}</h3>
          <span>{list.length} bàn</span>
        </div>
        <div className="tgrid">
          {list.map((t) => (
            <button key={t.id} className={`tcard ${cls[t.status]}`} onClick={() => setEdit(t)}>
              <div className="tcard-top">
                <b>{t.name}</b>
                <Badge tone={tone(t.status)}>{t.status}</Badge>
              </div>
              <div className="seats">
                {Array.from({ length: Math.min(t.seats, 8) }).map((_, i) => <i key={i} />)}
              </div>
              <small>{t.seats} chỗ ngồi · bấm để chỉnh sửa</small>
            </button>
          ))}
        </div>
      </section>
    )

  return (
    <>
      <Head
        title="Sơ đồ bàn"
        sub={states.map((s) => `${count(s)} ${s.toLowerCase()}`).join(', ')}
        action={<button className="btn pri" onClick={() => setEdit(blank)}>Thêm bàn</button>}
      />

      <div className="stats">
        <div className="stat"><span>Tổng số bàn</span><b>{tables.length}</b></div>
        <div className="stat ok"><span>Còn trống</span><b>{count('Trống')}</b></div>
        <div className="stat warn"><span>Có khách</span><b>{count('Có khách')}</b></div>
        <div className="stat"><span>Tổng chỗ ngồi</span><b>{totalSeats}</b></div>
      </div>

      <div className="chips tfilter">
        <button className={'chip' + (filter === 'all' ? ' on' : '')} onClick={() => setFilter('all')}>Tất cả</button>
        {states.map((s) => (
          <button key={s} className={'chip' + (filter === s ? ' on' : '')} onClick={() => setFilter(s)}>
            {s} ({count(s)})
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="tempty">Không có bàn nào ở trạng thái này.</p>}
      {zone('Trong nhà', '🏠', shown.filter((t) => !isOutdoor(t)))}
      {zone('Sân vườn', '🌿', shown.filter(isOutdoor))}

      {edit && (
        <Modal title={edit.id === 0 ? 'Thêm bàn mới' : `Chỉnh sửa ${edit.name}`} onClose={() => setEdit(null)}>
          <div className="form">
            <Field label="Trạng thái">
              <div className="chips">
                {states.map((s) => (
                  <button key={s} className={'chip' + (s === edit.status ? ' on' : '')} onClick={() => setEdit({ ...edit, status: s })}>{s}</button>
                ))}
              </div>
            </Field>
            <Field label="Tên bàn">
              <input value={edit.name} placeholder="Ví dụ: Bàn 9 hoặc Sân vườn 3" onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Số chỗ ngồi">
              <div className="stepper">
                <button className="btn sm" onClick={() => setEdit({ ...edit, seats: Math.max(1, edit.seats - 1) })}>−</button>
                <b>{edit.seats}</b>
                <button className="btn sm" onClick={() => setEdit({ ...edit, seats: edit.seats + 1 })}>+</button>
              </div>
            </Field>
            <div className="acts">
              {edit.id !== 0 && <button className="btn del" onClick={remove}>Xoá bàn</button>}
              <button className="btn" onClick={() => setEdit(null)}>Huỷ</button>
              <button className="btn pri" onClick={save}>Lưu</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}