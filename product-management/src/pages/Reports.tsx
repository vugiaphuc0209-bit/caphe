import { useState } from 'react'
import { useStore } from '../store'
import { month, week } from '../data'
import { Bars, Head, vnd } from '../ui'

export default function Reports() {
  const { products } = useStore()
  const [range, setRange] = useState<'7' | '30'>('7')
  const data = range === '7' ? week : month
  const sum = data.reduce((s, x) => s + x.v, 0)

  const byCat = Object.entries(
    products.reduce<Record<string, number>>((m, p) => ({ ...m, [p.cat]: (m[p.cat] ?? 0) + p.price * p.sold }), {}),
  ).sort((a, b) => b[1] - a[1])
  const catTotal = byCat.reduce((s, [, v]) => s + v, 0) || 1
  const top = [...products].sort((a, b) => b.price * b.sold - a.price * a.sold).slice(0, 5)

  return (
    <>
      <Head title="Báo cáo" sub="Doanh thu và hiệu quả kinh doanh" action={
        <div className="chips">
          <button className={'chip' + (range === '7' ? ' on' : '')} onClick={() => setRange('7')}>7 ngày</button>
          <button className={'chip' + (range === '30' ? ' on' : '')} onClick={() => setRange('30')}>30 ngày</button>
        </div>
      } />
      <div className="stats">
        <div className="card stat"><span>Tổng doanh thu</span><b>{vnd(sum)}</b></div>
        <div className="card stat"><span>Trung bình mỗi {range === '7' ? 'ngày' : 'tuần'}</span><b>{vnd(Math.round(sum / data.length))}</b></div>
        <div className="card stat"><span>Món bán chạy nhất</span><b style={{ fontSize: 18 }}>{[...products].sort((a, b) => b.sold - a.sold)[0]?.name ?? '—'}</b></div>
        <div className="card stat"><span>Nhóm đóng góp nhiều nhất</span><b style={{ fontSize: 18 }}>{byCat[0]?.[0] ?? '—'}</b></div>
      </div>
      <div className="grid2">
        <section className="card"><h3>Doanh thu theo {range === '7' ? 'ngày' : 'tuần'}</h3><Bars data={data} /></section>
        <section className="card">
          <h3>Doanh thu theo nhóm món</h3>
          <ul className="split">
            {byCat.map(([c, v]) => (
              <li key={c}>
                <div><span>{c}</span><span>{Math.round((v / catTotal) * 100)}%</span></div>
                <div className="meter"><i style={{ width: (v / catTotal) * 100 + '%' }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="card wrap">
        <h3>Top 5 món theo doanh thu</h3>
        <table>
          <thead><tr><th>Món</th><th>Nhóm</th><th className="r">Đã bán</th><th className="r">Doanh thu</th></tr></thead>
          <tbody>
            {top.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.cat}</td><td className="r">{p.sold}</td><td className="r">{vnd(p.price * p.sold)}</td></tr>)}
          </tbody>
        </table>
      </section>
    </>
  )
}
