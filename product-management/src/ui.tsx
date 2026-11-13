import type { ReactNode } from 'react'

export const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ'
export const short = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'tr' : Math.round(n / 1000) + 'k')

type Tone = 'ok' | 'warn' | 'bad' | 'mute'
const tones: Record<string, Tone> = {
  'Hoàn thành': 'ok', 'Đang pha': 'warn', 'Chờ pha chế': 'mute', 'Đã huỷ': 'bad',
  'Trống': 'ok', 'Có khách': 'warn', 'Đã đặt': 'mute',
}
export const tone = (s: string): Tone => tones[s] ?? 'mute'

export function Badge({ tone: t, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge ${t}`}>{children}</span>
}

export function Head({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label>{label}{children}</label>
}

export function Bars({ data }: { data: { l: string; v: number }[] }) {
  const max = Math.max(...data.map((x) => x.v))
  return (
    <div className="bars">
      {data.map((x) => (
        <div key={x.l} className="bar">
          <span>{short(x.v)}</span>
          <i style={{ height: (x.v / max) * 130 }} />
          <span>{x.l}</span>
        </div>
      ))}
    </div>
  )
}
