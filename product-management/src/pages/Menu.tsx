import { useState } from 'react'
import { useStore } from '../store'
import type { Product } from '../data'
import { Badge, Field, Head, Modal, vnd } from '../ui'

const blank: Product = { id: 0, name: '', cat: 'Cà phê', price: 30000, active: true, sold: 0 }

export default function Menu() {
  const { products, setProducts } = useStore()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Product | null>(null)
  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))

  const save = () => {
    if (!edit || !edit.name.trim()) return
    setProducts((l) => (edit.id === 0 ? [...l, { ...edit, id: Date.now() }] : l.map((p) => (p.id === edit.id ? edit : p))))
    setEdit(null)
  }
  const toggle = (id: number) => setProducts((l) => l.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))
  const remove = (id: number) => setProducts((l) => l.filter((p) => p.id !== id))

  return (
    <>
      <Head title="Thực đơn" sub={`${products.length} món`} action={<button className="btn pri" onClick={() => setEdit(blank)}>Thêm món</button>} />
      <div className="toolbar"><input placeholder="Tìm món..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <section className="card wrap">
        <table>
          <thead><tr><th>Tên món</th><th>Nhóm</th><th className="r">Giá</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.cat}</td><td className="r">{vnd(p.price)}</td>
                <td><Badge tone={p.active ? 'ok' : 'mute'}>{p.active ? 'Đang bán' : 'Tạm ngưng'}</Badge></td>
                <td className="acts">
                  <button className="btn sm" onClick={() => toggle(p.id)}>{p.active ? 'Ngưng bán' : 'Bán lại'}</button>
                  <button className="btn sm" onClick={() => setEdit(p)}>Sửa</button>
                  <button className="btn sm del" onClick={() => remove(p.id)}>Xoá</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="empty">Không tìm thấy món nào. Thử từ khoá khác hoặc thêm món mới.</p>}
      </section>
      {edit && (
        <Modal title={edit.id === 0 ? 'Thêm món' : 'Sửa món'} onClose={() => setEdit(null)}>
          <div className="form">
            <Field label="Tên món"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
            <Field label="Nhóm">
              <select value={edit.cat} onChange={(e) => setEdit({ ...edit, cat: e.target.value })}>
                {['Cà phê', 'Trà', 'Sinh tố', 'Bánh'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Giá bán (đ)"><input type="number" min={0} step={1000} value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></Field>
            <div className="acts">
              <button className="btn" onClick={() => setEdit(null)}>Huỷ</button>
              <button className="btn pri" onClick={save}>Lưu món</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
