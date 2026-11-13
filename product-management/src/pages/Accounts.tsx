import { useEffect, useState } from 'react'
import { call, saved } from '../auth'
import { Field, Head, Modal } from '../ui'

type Acc = { id: number; name: string; email: string; phone?: string; role: string }
const label: Record<string, string> = { owner: 'Chủ quán', staff: 'Nhân viên', user: 'Chưa cấp quyền' }
const blank = { name: '', email: '', phone: '', password: '' }

export default function Accounts() {
  const [list, setList] = useState<Acc[]>([])
  const [err, setErr] = useState('')
  const [form, setForm] = useState<typeof blank | null>(null)
  const [formErr, setFormErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    call<Acc[]>('/admin/accounts', 'GET', undefined, saved()).then(setList).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [])

  const setRole = async (id: number, role: 'staff' | 'user') => {
    try {
      await call(`/admin/accounts/${id}/role`, 'PATCH', { role }, saved())
      setErr('')
      load()
    } catch (e: any) {
      setErr(e.message)
    }
  }

  const create = async () => {
    if (!form) return
    setBusy(true)
    try {
      await call('/admin/accounts', 'POST', form, saved())
      setForm(null)
      setFormErr('')
      setErr('')
      load()
    } catch (e: any) {
      setFormErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Head
        title="Tài khoản"
        sub="Tạo tài khoản, cấp hoặc thu hồi quyền nhân viên"
        action={<button className="btn pri" onClick={() => { setFormErr(''); setForm(blank) }}>Thêm tài khoản nhân viên</button>}
      />
      <p className="ad-note">Bạn có thể tạo sẵn tài khoản cho nhân viên, hoặc cấp quyền cho người đã tự đăng ký.</p>
      {err && <p className="ad-err">{err}</p>}
      <section className="card wrap">
        <table>
          <thead><tr><th>Họ tên</th><th>Email</th><th>Số điện thoại</th><th>Vai trò</th><th className="r">Thao tác</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.phone || '—'}</td>
                <td><span className={'ad-pill ' + a.role}>{label[a.role] ?? a.role}</span></td>
                <td className="r">
                  {a.role === 'user' && <button className="ad-btn" onClick={() => setRole(a.id, 'staff')}>Cấp quyền nhân viên</button>}
                  {a.role === 'staff' && <button className="ad-btn off" onClick={() => setRole(a.id, 'user')}>Thu hồi quyền</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {form && (
        <Modal title="Thêm tài khoản nhân viên" onClose={() => setForm(null)}>
          <div className="form">
            <Field label="Họ tên">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Email đăng nhập">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Số điện thoại (không bắt buộc)">
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xx xxx xxx" />
            </Field>
            <Field label="Mật khẩu (tối thiểu 6 ký tự)">
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            {formErr && <p className="ad-err">{formErr}</p>}
            <div className="acts">
              <button className="btn" onClick={() => setForm(null)}>Huỷ</button>
              <button className="btn pri" onClick={create} disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
