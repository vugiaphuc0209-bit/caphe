import { useState } from 'react'
import { useStore } from '../store'
import type { Staff as S } from '../data'
import { Badge, Field, Head, Modal } from '../ui'

const blank: S = { id: 0, name: '', role: 'Pha chế', shift: 'Sáng (6h–12h)', phone: '', active: true }

export default function Staff() {
  const { staff, setStaff } = useStore()
  const [edit, setEdit] = useState<S | null>(null)

  const save = () => {
    if (!edit || !edit.name.trim()) return
    setStaff((l) => (edit.id === 0 ? [...l, { ...edit, id: Date.now() }] : l.map((x) => (x.id === edit.id ? edit : x))))
    setEdit(null)
  }
  const remove = (id: number) => setStaff((l) => l.filter((x) => x.id !== id))

  return (
    <>
      <Head title="Nhân viên" sub={`${staff.filter((s) => s.active).length} người đang làm việc`} action={<button className="btn pri" onClick={() => setEdit(blank)}>Thêm nhân viên</button>} />
      <section className="card wrap">
        <table>
          <thead><tr><th>Họ tên</th><th>Vị trí</th><th>Ca làm</th><th>Điện thoại</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td><span className="avatar">{s.name.split(' ').pop()?.[0]}</span>{s.name}</td>
                <td>{s.role}</td><td>{s.shift}</td><td>{s.phone}</td>
                <td><Badge tone={s.active ? 'ok' : 'mute'}>{s.active ? 'Đang làm' : 'Nghỉ'}</Badge></td>
                <td className="acts">
                  <button className="btn sm" onClick={() => setEdit(s)}>Sửa</button>
                  <button className="btn sm del" onClick={() => remove(s.id)}>Xoá</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {edit && (
        <Modal title={edit.id === 0 ? 'Thêm nhân viên' : 'Sửa thông tin'} onClose={() => setEdit(null)}>
          <div className="form">
            <Field label="Họ tên"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
            <Field label="Vị trí">
              <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                {['Quản lý', 'Thu ngân', 'Pha chế', 'Phục vụ'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Ca làm">
              <select value={edit.shift} onChange={(e) => setEdit({ ...edit, shift: e.target.value })}>
                {['Sáng (6h–12h)', 'Chiều (12h–18h)', 'Tối (18h–23h)'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Điện thoại"><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Trạng thái">
              <select value={edit.active ? '1' : '0'} onChange={(e) => setEdit({ ...edit, active: e.target.value === '1' })}>
                <option value="1">Đang làm</option><option value="0">Nghỉ</option>
              </select>
            </Field>
            <div className="acts">
              <button className="btn" onClick={() => setEdit(null)}>Huỷ</button>
              <button className="btn pri" onClick={save}>Lưu</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
