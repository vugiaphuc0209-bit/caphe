import { useState } from 'react'
import { useStore } from '../store'
import type { Stock } from '../data'
import { Badge, Field, Head, Modal } from '../ui'

export default function Inventory() {
  const { stock, setStock } = useStore()
  const [pick, setPick] = useState<Stock | null>(null)
  const [n, setN] = useState(10)
  const low = stock.filter((s) => s.qty <= s.min).length

  const restock = () => {
    if (!pick || !(n > 0)) return
    setStock((l) => l.map((x) => (x.id === pick.id ? { ...x, qty: x.qty + n } : x)))
    setPick(null)
  }

  return (
    <>
      <Head title="Kho nguyên liệu" sub={low ? `${low} nguyên liệu cần nhập thêm` : 'Kho đang đủ hàng'} />
      <section className="card wrap">
        <table>
          <thead><tr><th>Nguyên liệu</th><th>Tồn kho</th><th>Mức tồn</th><th>Nhà cung cấp</th><th></th></tr></thead>
          <tbody>
            {stock.map((s) => {
              const isLow = s.qty <= s.min
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.qty} {s.unit} {isLow && <Badge tone="warn">Sắp hết</Badge>}</td>
                  <td><div className={'meter' + (isLow ? ' low' : '')}><i style={{ width: Math.min(100, (s.qty / s.max) * 100) + '%' }} /></div></td>
                  <td>{s.supplier}</td>
                  <td className="acts"><button className="btn sm" onClick={() => { setPick(s); setN(10) }}>Nhập thêm</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
      {pick && (
        <Modal title={`Nhập thêm ${pick.name}`} onClose={() => setPick(null)}>
          <div className="form">
            <Field label={`Số lượng (${pick.unit})`}><input type="number" min={1} value={n} onChange={(e) => setN(Number(e.target.value))} autoFocus /></Field>
            <div className="acts">
              <button className="btn" onClick={() => setPick(null)}>Huỷ</button>
              <button className="btn pri" onClick={restock}>Xác nhận nhập</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
