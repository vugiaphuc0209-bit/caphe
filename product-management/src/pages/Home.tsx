import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAuth, saved } from '../auth'
import './home.css'

type Product = { id: number; name: string; cat: string; price: number; active: boolean; sold?: number }
type TableLite = { id: number; name: string; status: string }
export type PublicPage = 'home' | 'menu' | 'about' | 'contact'
type ShopMode = 'auto' | 'open' | 'closed'
type Sort = 'default' | 'hot' | 'asc' | 'desc' | 'name'
type PayMethod = 'Tiền mặt' | 'Chuyển khoản'
type Receipt = { id: string; total: number; method: PayMethod; place: string; name: string }

// ===== SỬA THÔNG TIN QUÁN Ở ĐÂY =====
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const SHOP = {
  name: 'Hạt Coffee House',
  address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
  phone: '0900 000 000',
  email: 'hello@hatcoffee.vn',
  openHour: 6,
  closeHour: 23,
  // thông tin nhận chuyển khoản (sửa thành tài khoản thật của quán)
  bank: 'Vietcombank',
  account: '0123456789',
  holder: 'HAT COFFEE HOUSE',
}
// =====================================

const NAV: { key: PublicPage; label: string; href: string }[] = [
  { key: 'home', label: 'Trang chủ', href: '#/trang-chu' },
  { key: 'menu', label: 'Thực đơn', href: '#/menu' },
  { key: 'about', label: 'Về chúng tôi', href: '#/ve-chung-toi' },
  { key: 'contact', label: 'Liên hệ', href: '#/lien-he' },
]

const FALLBACK: Product[] = [
  { id: 1, name: 'Cà phê sữa đá', cat: 'Cà phê', price: 29000, active: true },
  { id: 2, name: 'Bạc xỉu', cat: 'Cà phê', price: 32000, active: true },
  { id: 6, name: 'Trà đào cam sả', cat: 'Trà', price: 42000, active: true },
  { id: 11, name: 'Bánh croissant', cat: 'Bánh', price: 35000, active: true },
]

// Đánh giá mẫu, sửa lại thành lời khen thật của khách quán bạn
const REVIEWS = [
  { name: 'Hoàng Nam', text: 'Cà phê sữa đá đậm vị, ngồi làm việc cả buổi không ai giục.', stars: 5 },
  { name: 'Lan Phương', text: 'Trà đào cam sả thơm, sân vườn mát và yên tĩnh.', stars: 5 },
  { name: 'Tuấn Kiệt', text: 'Nhân viên thân thiện, lên món nhanh. Bánh tiramisu rất ngon.', stars: 4 },
]

const ICON: Record<string, string> = { 'Cà phê': '☕', 'Trà': '🍵', 'Sinh tố': '🥤', 'Bánh': '🥐', 'Đá xay': '🧋' }

const money = (n: number) => n.toLocaleString('vi-VN') + 'đ'

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

// ===== HIỆU ỨNG GIAO DIỆN (CSS nằm ngay trong file này) =====
const FX = `
html { scroll-behavior: smooth; }
.hm { overflow-x: clip; --fx1: #7a4e33; --fx2: #a8714a; --fx3: #e0a526; --fxd: #3a2316; }
.hm ::selection { background: rgba(224, 165, 38, .35); }

/* ============ keyframes ============ */
@keyframes hm-up    { from { opacity: 0; translate: 0 26px; } to { opacity: 1; translate: 0 0; } }
@keyframes hm-down  { from { opacity: 0; translate: 0 -100%; } to { opacity: 1; translate: 0 0; } }
@keyframes hm-fade  { from { opacity: 0; } to { opacity: 1; } }
@keyframes hm-pop   { 0% { scale: .4; opacity: 0; } 70% { scale: 1.25; } 100% { scale: 1; opacity: 1; } }
@keyframes hm-beat  { 0%, 100% { scale: 1; } 40% { scale: 1.5; } 70% { scale: .9; } }
@keyframes hm-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -14px; } }
@keyframes hm-drift { 0%, 100% { translate: 0 0; scale: 1; } 50% { translate: 40px -30px; scale: 1.12; } }
@keyframes hm-spark { 0%, 100% { opacity: .25; scale: .7; rotate: 0deg; } 50% { opacity: 1; scale: 1.2; rotate: 25deg; } }
@keyframes hm-shine { to { background-position: 200% center; } }
@keyframes hm-sweep { 0%, 55% { translate: -140% 0; } 100% { translate: 140% 0; } }
@keyframes hm-ring-ok  { 0% { box-shadow: 0 0 0 0 rgba(46, 160, 67, .55); } 100% { box-shadow: 0 0 0 10px rgba(46, 160, 67, 0); } }
@keyframes hm-ring-off { 0% { box-shadow: 0 0 0 0 rgba(200, 60, 50, .5); } 100% { box-shadow: 0 0 0 10px rgba(200, 60, 50, 0); } }
@keyframes hm-glow  { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 140, 40, 0); } 50% { box-shadow: 0 0 14px 2px rgba(255, 140, 40, .4); } }
@keyframes hm-toast { from { opacity: 0; translate: 0 18px; scale: .95; } to { opacity: 1; translate: 0 0; scale: 1; } }
@keyframes hm-prog  { to { transform: scaleX(1); } }

/* ============ nền trang + thanh tiến trình cuộn ============ */
.hm:not(.dark) {
  background:
    radial-gradient(900px 480px at 88% -8%, rgba(224, 165, 38, .20), transparent 60%),
    radial-gradient(800px 520px at -8% 28%, rgba(168, 113, 74, .16), transparent 62%),
    radial-gradient(700px 500px at 60% 78%, rgba(122, 78, 51, .08), transparent 65%),
    #f9f5ef;
}
.hm::before {
  content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 3px; z-index: 80;
  background: linear-gradient(90deg, var(--fx2), var(--fx3));
  transform: scaleX(0); transform-origin: 0 50%;
  animation: hm-prog linear both; animation-timeline: scroll(root);
}

/* ============ header kính mờ ============ */
.hm-head { transition: box-shadow .3s, background-color .3s; }
.hm:not(.dark) .hm-head { background: rgba(255, 255, 255, .78); backdrop-filter: saturate(1.5) blur(14px); }
.hm-head.sc { box-shadow: 0 10px 30px -10px rgba(60, 35, 20, .25); }
.hm-logo { transition: transform .25s; }
.hm-logo:hover { transform: scale(1.06) rotate(-2deg); }
.hm-nav a { position: relative; transition: color .2s, background-color .2s, transform .2s; }
.hm-nav a:hover { transform: translateY(-1px); }
.hm-nav a::after {
  content: ''; position: absolute; left: 50%; bottom: -3px; width: 0; height: 2px;
  background: linear-gradient(90deg, var(--fx2), var(--fx3)); border-radius: 2px; transition: width .25s, left .25s;
}
.hm-nav a:hover::after { width: 64%; left: 18%; }
.hm-icon { transition: transform .2s, background-color .2s, box-shadow .2s; }
.hm-icon:hover { transform: translateY(-2px) rotate(-8deg); box-shadow: 0 8px 16px -8px rgba(60, 35, 20, .45); }
.hm-icon:active { transform: scale(.9); }
.hm-badge { animation: hm-pop .4s cubic-bezier(.2, .9, .3, 1.4); }
.hm-searchbox .hm-search { transition: box-shadow .25s, width .3s, border-color .25s; }
.hm-searchbox .hm-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(224, 165, 38, .3); border-color: var(--fx2); }
.hm-ava { transition: transform .25s; background: linear-gradient(135deg, var(--fx2), var(--fx1)); color: #fff; }
.hm-userbtn:hover .hm-ava { transform: scale(1.12) rotate(8deg); }
.hm-umenu { animation: hm-up .25s ease both; transform-origin: top right; box-shadow: 0 24px 50px -18px rgba(40, 22, 12, .45); }

.hm-banner { animation: hm-down .5s cubic-bezier(.2, .8, .2, 1) both; }

/* ============ hero ============ */
.hm-hero { position: relative; isolation: isolate; }
.hm-hero::before {
  content: ''; position: absolute; z-index: -1; width: 460px; height: 460px; border-radius: 50%;
  right: -120px; top: -90px; filter: blur(70px); opacity: .55;
  background: radial-gradient(circle at 30% 30%, rgba(224, 165, 38, .8), rgba(168, 113, 74, .35) 60%, transparent 72%);
  animation: hm-drift 14s ease-in-out infinite;
}
.hm-hero::after {
  content: '✦'; position: absolute; z-index: -1; right: 5%; top: 3%; font-size: 30px; color: var(--fx3);
  animation: hm-spark 3.2s ease-in-out infinite;
}
.hm-hero > div:first-child > * { animation: hm-up .8s cubic-bezier(.2, .7, .2, 1) both; }
.hm-hero > div:first-child > *:nth-child(1) { animation-delay: .05s; }
.hm-hero > div:first-child > *:nth-child(2) { animation-delay: .15s; }
.hm-hero > div:first-child > *:nth-child(3) { animation-delay: .27s; }
.hm-hero > div:first-child > *:nth-child(4) { animation-delay: .39s; }
.hm-hero > div:first-child > *:nth-child(5) { animation-delay: .51s; }
.hm .hm-hero h1 {
  background: linear-gradient(100deg, #2f1d12 15%, #9a6a44 45%, #e0a526 55%, #2f1d12 85%);
  background-size: 220% auto; -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: hm-up .8s cubic-bezier(.2, .7, .2, 1) .15s both, hm-shine 9s linear 1s infinite;
}
.hm.dark .hm-hero h1 {
  background-image: linear-gradient(100deg, #f4e9dc 15%, #e0a526 50%, #f4e9dc 85%);
}
.hm-hero-img { position: relative; animation: hm-float 6.5s ease-in-out infinite, hm-fade 1s ease both; transition: transform .5s, box-shadow .5s; box-shadow: 0 30px 60px -24px rgba(60, 35, 20, .55); }
.hm-hero-img::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, .28) 50%, transparent 62%);
  animation: hm-sweep 5.5s ease-in-out infinite;
}
.hm-hero-img:hover { transform: rotate(-1.5deg) scale(1.03); box-shadow: 0 40px 70px -24px rgba(60, 35, 20, .6); }
.hm-pill { backdrop-filter: blur(6px); box-shadow: 0 6px 16px -10px rgba(60, 35, 20, .5); }
.hm-pill i { display: inline-block; border-radius: 50%; }
.hm-pill.ok i  { animation: hm-ring-ok 1.8s infinite; }
.hm-pill.off i { animation: hm-ring-off 1.8s infinite; }
.hm-toggle { transition: transform .2s, background-color .2s, box-shadow .2s; }
.hm-toggle:hover { transform: translateY(-2px); box-shadow: 0 8px 16px -6px rgba(60, 35, 20, .35); }
.hm-stats > div { transition: transform .25s; }
.hm-stats > div:hover { transform: translateY(-5px); }
.hm-stats b { background: linear-gradient(135deg, var(--fx1), var(--fx3)); -webkit-background-clip: text; background-clip: text; color: transparent; }

/* ============ nút ============ */
.hm-btn { position: relative; overflow: hidden; transition: transform .2s, box-shadow .25s, filter .2s; }
.hm-btn:not(.ghost):not(:disabled) { background: linear-gradient(135deg, #8a5a3a, #5a3623); color: #fff; }
.hm-btn::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, .38) 50%, transparent 70%);
  transform: translateX(-130%); transition: transform .7s;
}
.hm-btn:not(:disabled):hover { transform: translateY(-3px); box-shadow: 0 14px 26px -10px rgba(60, 35, 20, .6); }
.hm-btn:not(:disabled):hover::after { transform: translateX(130%); }
.hm-btn:not(:disabled):active { transform: translateY(0) scale(.96); }

/* ============ tiêu đề mục ============ */
.hm-sec h2::after {
  content: ''; display: block; width: 44px; height: 4px; margin-top: 10px; border-radius: 4px;
  background: linear-gradient(90deg, var(--fx2), var(--fx3)); transition: width .4s cubic-bezier(.2, .8, .2, 1);
}
.hm-sec:hover h2::after { width: 96px; }

/* ============ chip lọc ============ */
.hm-chips button { transition: transform .2s, background-color .2s, color .2s, box-shadow .2s, border-color .2s; }
.hm-chips button:hover { transform: translateY(-3px); border-color: var(--fx2); }
.hm-chips button.on { background: linear-gradient(135deg, #8a5a3a, #5a3623); color: #fff; box-shadow: 0 10px 18px -8px rgba(60, 35, 20, .6); }

/* ============ thẻ món ============ */
.hm-card { position: relative; overflow: hidden; border-radius: 18px; transition: transform .3s cubic-bezier(.2, .8, .2, 1), box-shadow .3s, border-color .3s; }
.hm:not(.dark) .hm-card { background: linear-gradient(180deg, #ffffff, #fffaf3); }
.hm-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: linear-gradient(180deg, var(--fx3), var(--fx2));
  transform: scaleY(0); transform-origin: 50% 100%; transition: transform .35s;
}
.hm-card:hover { transform: translateY(-7px) scale(1.012); box-shadow: 0 22px 38px -18px rgba(60, 35, 20, .5); border-color: rgba(168, 113, 74, .5); }
.hm-card:hover::before { transform: scaleY(1); }
.hm-emoji { transition: transform .45s cubic-bezier(.2, .9, .3, 1.4); }
.hm:not(.dark) .hm-emoji { background: linear-gradient(135deg, #f7e9d8, #edd3b8); }
.hm-card:hover .hm-emoji { transform: scale(1.22) rotate(-10deg); }
.hm-card-act button { transition: transform .15s, background-color .2s, color .2s, box-shadow .2s; }
.hm-card-act button:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 14px -8px rgba(60, 35, 20, .55); }
.hm-card-act button:not(:disabled):active { transform: scale(.9); }
.hm-heart.on { animation: hm-beat .5s ease; }
.hm-hot { animation: hm-glow 2.2s infinite; border-radius: 999px; }

/* ============ khối giới thiệu / đánh giá ============ */
.hm-feat { position: relative; border-radius: 20px; transition: transform .3s cubic-bezier(.2, .8, .2, 1), box-shadow .3s; }
.hm:not(.dark) .hm-feat { background: linear-gradient(180deg, #ffffff, #fff8ef); }
.hm-feat:hover { transform: translateY(-8px); box-shadow: 0 24px 40px -20px rgba(60, 35, 20, .5); }
.hm-feat > span {
  display: inline-grid; place-items: center; width: 54px; height: 54px; border-radius: 18px; font-size: 26px;
  transition: transform .45s cubic-bezier(.2, .9, .3, 1.4);
}
.hm:not(.dark) .hm-feat > span { background: linear-gradient(135deg, #f7e9d8, #ecd0b2); }
.hm.dark .hm-feat > span { background: rgba(255, 255, 255, .08); }
.hm-feat:hover > span { transform: scale(1.2) rotate(-9deg); }
.hm-review::before { content: '“'; position: absolute; top: 4px; right: 18px; font: 700 78px/1 Georgia, serif; color: var(--fx3); opacity: .22; }
.hm-stars { letter-spacing: 3px; color: #e0a526; text-shadow: 0 2px 8px rgba(224, 165, 38, .45); }

/* ============ khối kêu gọi ============ */
.hm-cta {
  position: relative; overflow: hidden; border-radius: 24px; color: #fff;
  background: linear-gradient(120deg, #4e3020, #8a5a3a 60%, #b17a4a);
  transition: transform .35s, box-shadow .35s;
}
.hm-cta::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, .16) 50%, transparent 62%);
  animation: hm-sweep 7s ease-in-out infinite;
}
.hm-cta b, .hm-cta p { color: #fff; }
.hm-cta p { opacity: .88; }
.hm-cta .hm-open   { color: #a8f0b5; }
.hm-cta .hm-closed { color: #ffb9b0; }
.hm-cta .hm-btn:not(:disabled) { background: #fff; color: #4e3020; }
.hm-cta:hover { transform: translateY(-4px); box-shadow: 0 28px 46px -22px rgba(60, 35, 20, .65); }

/* ============ form liên hệ ============ */
.hm-form input, .hm-form textarea { transition: border-color .2s, box-shadow .2s; }
.hm-form input:focus, .hm-form textarea:focus { outline: none; border-color: var(--fx2); box-shadow: 0 0 0 4px rgba(224, 165, 38, .25); }
.hm-contact > div { transition: transform .2s; }
.hm-contact > div:hover { transform: translateX(6px); }

/* ============ hiện dần khi cuộn tới ============ */
.hm-rv { opacity: 0; }
.hm-rv.hm-in { opacity: 1; animation: hm-up .7s cubic-bezier(.2, .7, .2, 1) var(--d, 0ms) backwards; }

/* ============ giỏ hàng ============ */
.hm-overlay { animation: hm-fade .3s ease both; backdrop-filter: blur(3px); }
.hm-cart { box-shadow: -28px 0 70px -24px rgba(40, 22, 12, .55); }
.hm-line { animation: hm-up .3s ease both; }
.hm-qty button { transition: transform .15s, background-color .2s; }
.hm-qty button:hover { transform: scale(1.12); }
.hm-qty button:active { transform: scale(.85); }
.hm-done { animation: hm-pop .55s cubic-bezier(.2, .9, .3, 1.2) both; }

/* ============ thông báo, nút lên đầu ============ */
.hm-toast { animation: hm-toast .4s cubic-bezier(.2, .9, .3, 1.2) both; backdrop-filter: blur(10px); box-shadow: 0 18px 36px -14px rgba(40, 22, 12, .6); }
.hm-totop { animation: hm-pop .4s ease both; transition: transform .2s, box-shadow .2s; background: linear-gradient(135deg, #8a5a3a, #5a3623); color: #fff; }
.hm-totop:hover { transform: translateY(-5px); box-shadow: 0 14px 24px -10px rgba(60, 35, 20, .65); }

.hm-page { animation: hm-up .55s ease both; }

/* ============ thanh cuộn ============ */
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-thumb { background: linear-gradient(180deg, var(--fx2), var(--fx1)); border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
  .hm-rv { opacity: 1; }
}
`

// Hình minh hoạ ly cà phê (SVG, có khói bay)

function CoffeeArt() {
  return (
    <svg viewBox="0 0 320 240" className="hm-art" role="img" aria-label="Ly cà phê">
      <ellipse cx="160" cy="208" rx="112" ry="14" fill="rgba(0,0,0,.22)" />
      <ellipse cx="160" cy="192" rx="106" ry="18" fill="#f4e9dc" />
      <ellipse cx="160" cy="188" rx="82" ry="12" fill="#e6d3bf" />
      <path d="M225 120h12c17 0 27 10 27 24s-10 24-27 24h-16" fill="none" stroke="#fff8ef" strokeWidth="11" strokeLinecap="round" />
      <path d="M95 106h130v48c0 28-26 44-65 44s-65-16-65-44z" fill="#fff8ef" />
      <path d="M95 140h130v14c0 28-26 44-65 44s-65-16-65-44z" fill="#f1e2d0" opacity=".55" />
      <ellipse cx="160" cy="106" rx="65" ry="14" fill="#fff8ef" />
      <ellipse cx="160" cy="107" rx="56" ry="10" fill="#4a2c1a" />
      <path d="M133 107q13-6 27 0t27 0" stroke="#c99b6d" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path className="hm-steam s1" d="M138 86c-12-10 10-18 0-32" />
      <path className="hm-steam s2" d="M160 82c-12-10 10-18 0-34" />
      <path className="hm-steam s3" d="M182 86c-12-10 10-18 0-32" />
      <g transform="translate(46 176) rotate(-25)">
        <ellipse rx="15" ry="9.5" fill="#5b3a25" />
        <path d="M-13 0q13-6 26 0" stroke="#2f1a0f" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(278 182) rotate(30)">
        <ellipse rx="15" ry="9.5" fill="#6b4630" />
        <path d="M-13 0q13-6 26 0" stroke="#2f1a0f" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(262 204) rotate(-10)">
        <ellipse rx="12" ry="7.5" fill="#5b3a25" />
        <path d="M-10 0q10-5 20 0" stroke="#2f1a0f" strokeWidth="2" fill="none" />
      </g>
    </svg>
  )
}

export default function Home({ page = 'home' }: { page?: PublicPage }) {
  const auth: any = useAuth()
  const user = auth.user
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<TableLite[]>([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Tất cả')
  const [favCat, setFavCat] = useState('Tất cả')
  const [sort, setSort] = useState<Sort>('default')
  const [onlyFav, setOnlyFav] = useState(false)
  const [fav, setFav] = useState<number[]>(() => load<number[]>('hm-fav', []))
  const [cart, setCart] = useState<Record<number, number>>(() => load<Record<number, number>>('hm-cart', {}))
  const [place, setPlace] = useState('Mang đi')
  const [sending, setSending] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number>(0)
  const [dark, setDark] = useState(() => localStorage.getItem('hm-dark') === '1')
  // trạng thái đóng/mở cửa do back end giữ, khách chỉ xem
  const [mode, setMode] = useState<ShopMode>('auto')
  const [now, setNow] = useState(new Date())
  const [msg, setMsg] = useState({ name: '', phone: '', text: '' })

  // thanh toán
  const [step, setStep] = useState<'cart' | 'pay'>('cart')
  const [info, setInfo] = useState<{ name: string; phone: string; note: string; method: PayMethod }>(() => ({
    name: '',
    phone: localStorage.getItem('hm-phone') ?? '',
    note: '',
    method: 'Tiền mặt',
  }))
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  useEffect(() => {
    fetch(`${API}/products`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Product[]) => setProducts(d.filter((p) => p.active)))
      .catch(() => setProducts(FALLBACK))
    fetch(`${API}/tables`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: TableLite[]) => setTables(d))
      .catch(() => setTables([]))
  }, [])

  // lấy trạng thái cửa hàng từ back end, tự cập nhật mỗi 5 giây
  useEffect(() => {
    const loadMode = () =>
      fetch(`${API}/store-status`)
        .then((r) => r.json())
        .then((d) => setMode(d.mode))
        .catch(() => {})
    loadMode()
    const t = setInterval(loadMode, 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { localStorage.setItem('hm-dark', dark ? '1' : '0') }, [dark])
  useEffect(() => { localStorage.setItem('hm-fav', JSON.stringify(fav)) }, [fav])
  useEffect(() => { localStorage.setItem('hm-cart', JSON.stringify(cart)) }, [cart])

  // đã đăng nhập thì điền sẵn tên và số điện thoại đã đăng ký vào form thanh toán (khách vẫn sửa được)
  useEffect(() => {
    const n: string = user?.name || user?.fullName || user?.username || ''
    const p: string = user?.phone || ''
    if (n || p) setInfo((i) => ({ ...i, name: i.name || n, phone: p || i.phone }))
  }, [user])

  // đổi trang thì cuộn lên đầu và đóng menu
  useEffect(() => {
    window.scrollTo(0, 0)
    setMenuOpen(false)
    setUserMenu(false)
  }, [page])

  // hiện nút lên đầu trang và làm mờ kính header khi cuộn xuống
  useEffect(() => {
    const on = () => {
      setShowTop(window.scrollY > 400)
      document.querySelector('.hm-head')?.classList.toggle('sc', window.scrollY > 10)
    }
    on()
    window.addEventListener('scroll', on)
    return () => window.removeEventListener('scroll', on)
  }, [])

  // hiện dần các khối khi cuộn tới
  useLayoutEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(
      '.hm-sec h2, .hm-card, .hm-feat, .hm-cta, .hm-form, .hm-contact',
    )
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('hm-in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12 },
    )
    els.forEach((el) => {
      if (el.classList.contains('hm-in') || el.classList.contains('hm-rv')) return
      const i = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0
      el.style.setProperty('--d', (i % 6) * 70 + 'ms')
      el.classList.add('hm-rv')
      io.observe(el)
    })
    return () => io.disconnect()
  }, [page, products, favCat, cat, sort, onlyFav, q])

  // nhấn Esc để đóng giỏ hàng / menu
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCartOpen(false)
        setUserMenu(false)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const timeOpen = now.getHours() >= SHOP.openHour && now.getHours() < SHOP.closeHour
  const isOpen = mode === 'auto' ? timeOpen : mode === 'open'

  const cats = useMemo(() => ['Tất cả', ...Array.from(new Set(products.map((p) => p.cat)))], [products])

  // 3 món bán chạy nhất (nếu back end có số lượng đã bán)
  const hot = useMemo(
    () =>
      new Set(
        [...products]
          .filter((p) => (p.sold ?? 0) > 0)
          .sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
          .slice(0, 3)
          .map((p) => p.id),
      ),
    [products],
  )

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    const list = products.filter(
      (p) =>
        (cat === 'Tất cả' || p.cat === cat) &&
        (!k || p.name.toLowerCase().includes(k)) &&
        (!onlyFav || fav.includes(p.id)),
    )
    if (sort === 'asc') list.sort((a, b) => a.price - b.price)
    else if (sort === 'desc') list.sort((a, b) => b.price - a.price)
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    else if (sort === 'hot') list.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
    return list
  }, [products, q, cat, sort, onlyFav, fav])

  const favs = useMemo(
    () =>
      products
        .filter((p) => favCat === 'Tất cả' || p.cat === favCat)
        .sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
        .slice(0, 6),
    [products, favCat],
  )

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ p: products.find((x) => x.id === Number(id)), qty }))
    .filter((l): l is { p: Product; qty: number } => !!l.p && l.qty > 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0)

  const places = ['Mang đi', ...tables.filter((t) => t.status === 'Trống').map((t) => t.name)]

  const flash = (t: string) => {
    setToast(t)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2000)
  }

  // chỉ chủ quán / nhân viên đổi được trạng thái cửa hàng (back end cũng kiểm tra lại)
  const changeMode = async (m: ShopMode) => {
    try {
      const r = await fetch(`${API}/store-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + saved() },
        body: JSON.stringify({ mode: m }),
      })
      if (!r.ok) throw new Error()
      setMode((await r.json()).mode)
    } catch {
      flash('Không đổi được trạng thái cửa hàng')
    }
  }

  const add = (id: number, d = 1) => {
    if (d > 0 && !isOpen) {
      flash('Quán đang đóng cửa, chưa nhận món')
      return
    }
    setCart((c) => {
      const n = (c[id] ?? 0) + d
      const next = { ...c }
      if (n <= 0) delete next[id]
      else next[id] = n
      return next
    })
    if (d > 0) {
      setReceipt(null)
      const p = products.find((x) => x.id === id)
      if (p) flash(`Đã thêm ${p.name} vào giỏ`)
    }
  }

  const toggleFav = (id: number) =>
    setFav((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  const closeCart = () => {
    setCartOpen(false)
    setStep('cart')
  }

  // vào bước thanh toán
  const goPay = () => {
    if (!count) return
    if (!isOpen) {
      flash('Quán đang đóng cửa, chưa nhận đơn')
      return
    }
    setReceipt(null)
    setStep('pay')
  }

  const phoneOk = /^0\d{9,10}$/.test(info.phone.replace(/\s/g, ''))
  const canSubmit = !!count && !sending && isOpen && info.name.trim().length > 0 && phoneOk

  // gửi đơn thẳng cho quầy
  const submitOrder = async () => {
    if (!canSubmit) return
    setSending(true)
    const sum = total
    try {
      const r = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: place,
          lines: lines.map((l) => ({ id: l.p.id, qty: l.qty })),
          staff: 'Khách đặt',
          customer: info.name.trim(),
          phone: info.phone.replace(/\s/g, ''),
          note: info.note.trim(),
          payMethod: info.method,
          paid: false,
        }),
      })
      if (!r.ok) throw new Error()
      const o = await r.json()
      if (!user) localStorage.setItem('hm-phone', info.phone) // khách vãng lai: nhớ số lần sau
      setReceipt({
        id: o?.id ? String(o.id) : '',
        total: typeof o?.total === 'number' ? o.total : sum,
        method: info.method,
        place,
        name: info.name.trim(),
      })
      setCart({})
      setStep('cart')
      setInfo((i) => ({ ...i, note: '' }))
    } catch {
      flash('Không gửi được đơn. Hãy đưa giỏ hàng cho nhân viên tại quầy.')
    }
    setSending(false)
  }

  // thông tin người dùng
  const isStaff = user?.role === 'staff' || user?.role === 'owner'
  const display: string = user?.name || user?.fullName || user?.username || user?.email || 'bạn'
  const initial = display.trim().split(' ').pop()?.[0]?.toUpperCase() ?? '?'
  const doLogout = () => {
    setUserMenu(false)
    if (typeof auth.logout === 'function') auth.logout()
    else if (typeof auth.signOut === 'function') auth.signOut()
    else {
      Object.keys(localStorage)
        .filter((k) => /token|user|auth|session/i.test(k))
        .forEach((k) => localStorage.removeItem(k))
      location.hash = '/trang-chu'
      location.reload()
    }
  }

  const card = (p: Product) => (
    <div className="hm-card" key={p.id}>
      <span className="hm-emoji">{ICON[p.cat] ?? '☕'}</span>
      <div className="hm-card-i">
        <b>
          {p.name}
          {hot.has(p.id) && <em className="hm-hot">🔥 Bán chạy</em>}
        </b>
        <small>{p.cat}{p.sold ? ` · đã bán ${p.sold}` : ''}</small>
      </div>
      <div className="hm-card-r">
        <span>{money(p.price)}</span>
        <div className="hm-card-act">
          <button
            className={'hm-heart' + (fav.includes(p.id) ? ' on' : '')}
            onClick={() => toggleFav(p.id)}
            title={fav.includes(p.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          >
            {fav.includes(p.id) ? '♥' : '♡'}
          </button>
          <button disabled={!isOpen} onClick={() => add(p.id)}>
            {isOpen ? '+ Thêm' : 'Đóng cửa'}
          </button>
        </div>
      </div>
    </div>
  )

  const chips = (value: string, set: (c: string) => void) => (
    <div className="hm-chips">
      {cats.map((c) => (
        <button key={c} className={c === value ? 'on' : ''} onClick={() => set(c)}>
          {ICON[c] ? ICON[c] + ' ' : ''}{c}
        </button>
      ))}
    </div>
  )

  const sendMail = () => {
    if (!msg.text.trim()) return
    const subject = encodeURIComponent(`Liên hệ từ ${msg.name || 'khách hàng'}`)
    const body = encodeURIComponent(`${msg.text}\n\nHọ tên: ${msg.name}\nSố điện thoại: ${msg.phone}`)
    location.href = `mailto:${SHOP.email}?subject=${subject}&body=${body}`
  }

  const status = (
    <b className={isOpen ? 'hm-open' : 'hm-closed'}>
      {isOpen ? 'Đang mở cửa' : mode === 'closed' ? 'Tạm đóng cửa' : 'Đã đóng cửa'}
    </b>
  )

  const field: React.CSSProperties = { display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box' }
  const lab: React.CSSProperties = { display: 'block', marginTop: 12, fontSize: 13 }

  return (
    <div className={'hm' + (dark ? ' dark' : '')}>
      <style>{FX}</style>

      <header className="hm-head">
        <div className="hm-bar">
          <button className="hm-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
          <a className="hm-logo" href="#/trang-chu">☕ {SHOP.name}</a>

          <nav className={'hm-nav' + (menuOpen ? ' open' : '')}>
            {NAV.map((n) => (
              <a key={n.key} href={n.href} className={n.key === page ? 'on' : ''} onClick={() => setMenuOpen(false)}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hm-actions">
            <div className="hm-searchbox">
              <input
                className="hm-search"
                placeholder="Tìm món..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  if (page !== 'menu') location.hash = '/menu'
                }}
              />
              {q && <button className="hm-clear" onClick={() => setQ('')} aria-label="Xoá tìm kiếm">✕</button>}
            </div>
            <button className="hm-icon" onClick={() => setDark(!dark)} title="Đổi giao diện sáng/tối">
              {dark ? '☀️' : '🌙'}
            </button>
            <button className="hm-icon" onClick={() => setCartOpen(true)} title="Giỏ hàng">
              🛒{count > 0 && <span key={count} className="hm-badge">{count}</span>}
            </button>
            {user ? (
              <div className="hm-user">
                <button className="hm-userbtn" onClick={() => setUserMenu(!userMenu)}>
                  <span className="hm-ava">{initial}</span>
                  <span className="hm-hello">Xin chào, <b>{display}</b></span>
                  <span className="hm-caret">▾</span>
                </button>
                {userMenu && (
                  <>
                    <div className="hm-umask" onClick={() => setUserMenu(false)} />
                    <div className="hm-umenu">
                      <div className="hm-uinfo">
                        <b>{display}</b>
                        {user.email && <small>{user.email}</small>}
                      </div>
                      {isStaff && (
                        <>
                          <div className="hm-shopctl">
                            <small>Trạng thái cửa hàng</small>
                            <div className="hm-seg">
                              <button className={mode === 'auto' ? 'on' : ''} onClick={() => changeMode('auto')}>Tự động</button>
                              <button className={mode === 'open' ? 'on' : ''} onClick={() => changeMode('open')}>Mở cửa</button>
                              <button className={mode === 'closed' ? 'on' : ''} onClick={() => changeMode('closed')}>Đóng cửa</button>
                            </div>
                          </div>
                          <a href="#/" onClick={() => setUserMenu(false)}>🛠️ Vào quản trị</a>
                        </>
                      )}
                      <button className="out" onClick={doLogout}>↪ Đăng xuất</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <a className="hm-link" href="#/dang-nhap">Đăng nhập</a>
                <a className="hm-btn" href="#/dang-ky">Đăng ký</a>
              </>
            )}
          </div>
        </div>
      </header>

      {!isOpen && (
        <div className="hm-banner">
          {mode === 'closed'
            ? 'Quán tạm đóng cửa, hiện chưa nhận đơn.'
            : `Quán đã đóng cửa. Mở lại lúc ${SHOP.openHour}:00 mỗi ngày.`}
        </div>
      )}

      {page === 'home' && (
        <>
          <section className="hm-hero">
            <div>
              <div className="hm-pillrow">
                <span className={'hm-pill ' + (isOpen ? 'ok' : 'off')}>
                  <i />
                  {isOpen
                    ? mode === 'auto' ? `Đang mở cửa · đến ${SHOP.closeHour}:00` : 'Đang mở cửa'
                    : mode === 'auto' ? `Đã đóng cửa · mở lại lúc ${SHOP.openHour}:00` : 'Tạm đóng cửa'}
                </span>
                {isStaff && (
                  <button className="hm-toggle" onClick={() => changeMode(isOpen ? 'closed' : 'open')}>
                    {isOpen ? 'Đóng cửa' : 'Mở cửa'}
                  </button>
                )}
              </div>
              <h1>Cà phê rang mới mỗi ngày, ngồi lâu cũng được</h1>
              <p>{SHOP.name} phục vụ cà phê, trà và bánh ngọt trong không gian yên tĩnh. Ghé quán hoặc chọn món bên dưới.</p>
              <div className="hm-hero-btns">
                <a className="hm-btn" href="#/menu">Xem thực đơn</a>
                <a className="hm-btn ghost" href="#/lien-he">Liên hệ</a>
              </div>
              <div className="hm-stats">
                <div><b>{products.length || '—'}</b><span>món trong thực đơn</span></div>
                <div><b>{SHOP.openHour}h–{SHOP.closeHour}h</b><span>mở cửa mỗi ngày</span></div>
                <div><b>{fav.length}</b><span>món yêu thích của bạn</span></div>
              </div>
            </div>
            <div className="hm-hero-img"><CoffeeArt /></div>
          </section>

          <section className="hm-sec">
            <h2>Món được yêu thích</h2>
            {chips(favCat, setFavCat)}
            <div className="hm-grid">{favs.map(card)}</div>
            <p className="hm-more"><a href="#/menu">Xem toàn bộ thực đơn →</a></p>
          </section>

          <section className="hm-sec">
            <div className="hm-feats">
              <div className="hm-feat"><span>🌱</span><b>Hạt chọn lọc</b><p>Robusta và Arabica từ các nhà rang trong nước.</p></div>
              <div className="hm-feat"><span>☕</span><b>Pha tại quầy</b><p>Mỗi ly được pha khi bạn gọi, không pha sẵn.</p></div>
              <div className="hm-feat"><span>🪴</span><b>Không gian yên tĩnh</b><p>Chỗ ngồi trong nhà và sân vườn.</p></div>
            </div>
          </section>

          <section className="hm-sec">
            <h2>Khách nói gì về quán</h2>
            <div className="hm-feats">
              {REVIEWS.map((r) => (
                <div className="hm-feat hm-review" key={r.name}>
                  <div className="hm-stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                  <p>“{r.text}”</p>
                  <b>{r.name}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="hm-sec">
            <div className="hm-cta">
              <div>
                <b>Ghé quán hôm nay</b>
                <p>{SHOP.address} · {SHOP.openHour}:00 – {SHOP.closeHour}:00 · {status}</p>
              </div>
              <a className="hm-btn" href="#/lien-he">Xem thông tin liên hệ</a>
            </div>
          </section>
        </>
      )}

      {page === 'menu' && (
        <section className="hm-sec hm-page">
          <h2>Thực đơn</h2>
          <p className="hm-sub">Chọn món rồi gửi đơn cho quầy, hoặc đưa giỏ hàng cho nhân viên để gọi món.</p>
          {chips(cat, setCat)}
          <div className="hm-tools">
            <button className={'hm-favtoggle' + (onlyFav ? ' on' : '')} onClick={() => setOnlyFav(!onlyFav)}>
              {onlyFav ? '♥' : '♡'} Yêu thích ({fav.length})
            </button>
            <label className="hm-sortl">
              Sắp xếp
              <select className="hm-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="default">Mặc định</option>
                <option value="hot">Bán chạy nhất</option>
                <option value="asc">Giá thấp đến cao</option>
                <option value="desc">Giá cao đến thấp</option>
                <option value="name">Tên A đến Z</option>
              </select>
            </label>
            <span className="hm-count">{shown.length} món</span>
          </div>
          {shown.length === 0 ? (
            <p className="hm-empty">
              {onlyFav ? 'Bạn chưa chọn món yêu thích nào. Bấm ♡ trên món để lưu lại.' : 'Không tìm thấy món phù hợp.'}
            </p>
          ) : (
            <div className="hm-grid">{shown.map(card)}</div>
          )}
        </section>
      )}

      {page === 'about' && (
        <section className="hm-sec hm-page">
          <h2>Về chúng tôi</h2>
          <p className="hm-text">
            Hạt Coffee House chọn hạt Robusta và Arabica từ các nhà rang trong nước, pha tại quầy mỗi ngày.
            Quán có chỗ ngồi trong nhà và sân vườn, phù hợp làm việc, gặp bạn bè hoặc ngồi một mình.
          </p>
          <div className="hm-feats">
            <div className="hm-feat"><span>🌱</span><b>Nguyên liệu</b><p>Hạt cà phê rang mới, trà và trái cây theo ngày.</p></div>
            <div className="hm-feat"><span>🤝</span><b>Phục vụ</b><p>Nhân viên thân thiện, gọi món nhanh tại quầy hoặc tại bàn.</p></div>
            <div className="hm-feat"><span>🪴</span><b>Không gian</b><p>Yên tĩnh, có sân vườn, ngồi lâu không bị giục.</p></div>
          </div>
          <div className="hm-cta">
            <div><b>Thử một ly nhé?</b><p>Xem thực đơn và chọn món bạn thích.</p></div>
            <a className="hm-btn" href="#/menu">Xem thực đơn</a>
          </div>
        </section>
      )}

      {page === 'contact' && (
        <section className="hm-sec hm-page">
          <h2>Liên hệ</h2>
          <div className="hm-two">
            <div>
              <div className="hm-contact">
                <div>📍 {SHOP.address}</div>
                <div>📞 <a href={`tel:${SHOP.phone.replace(/\s/g, '')}`}>{SHOP.phone}</a></div>
                <div>✉️ <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></div>
                <div>🕒 {SHOP.openHour}:00 – {SHOP.closeHour}:00 mỗi ngày · {status}</div>
              </div>
              <p className="hm-more">
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.address)}`} target="_blank" rel="noreferrer">
                  Xem bản đồ →
                </a>
              </p>
            </div>
            <div className="hm-form">
              <b>Gửi lời nhắn</b>
              <input placeholder="Họ tên" value={msg.name} onChange={(e) => setMsg({ ...msg, name: e.target.value })} />
              <input placeholder="Số điện thoại" value={msg.phone} onChange={(e) => setMsg({ ...msg, phone: e.target.value })} />
              <textarea rows={4} placeholder="Nội dung" value={msg.text} onChange={(e) => setMsg({ ...msg, text: e.target.value })} />
              <button className="hm-btn" onClick={sendMail} disabled={!msg.text.trim()}>Gửi qua email</button>
              <small>Nút này sẽ mở ứng dụng email của bạn với nội dung đã điền sẵn.</small>
            </div>
          </div>
        </section>
      )}

      <footer className="hm-foot">
        © {new Date().getFullYear()} {SHOP.name}
        {!user && <> · <a href="#/dang-nhap-nv">Dành cho nhân viên</a></>}
      </footer>

      {toast && <div className="hm-toast">{toast}</div>}
      {showTop && <button className="hm-totop" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Lên đầu trang">↑</button>}

      {cartOpen && <div className="hm-overlay" onClick={closeCart} />}
      <aside className={'hm-cart' + (cartOpen ? ' open' : '')}>
        <div className="hm-cart-h">
          <b>{receipt ? 'Đặt hàng thành công' : step === 'pay' ? 'Thanh toán' : `Giỏ hàng (${count})`}</b>
          <button onClick={closeCart}>✕</button>
        </div>

        <div className="hm-cart-b">
          {/* ===== Phiếu đặt hàng thành công ===== */}
          {receipt && (
            <div className="hm-done">
              <p>✅ Cảm ơn {receipt.name}! Quầy đã nhận đơn{receipt.id ? ` ${receipt.id}` : ''}.</p>
              <p>Nhận món: <b>{receipt.place}</b></p>
              <p>Tổng tiền: <b>{money(receipt.total)}</b></p>
              {receipt.method === 'Tiền mặt' ? (
                <p>Hình thức: tiền mặt. Bạn thanh toán tại quầy khi nhận món.</p>
              ) : (
                <>
                  <p>Hình thức: chuyển khoản. Vui lòng chuyển đến:</p>
                  <p>
                    {SHOP.bank}<br />
                    Số tài khoản: <b>{SHOP.account}</b><br />
                    Chủ tài khoản: {SHOP.holder}<br />
                    Số tiền: <b>{money(receipt.total)}</b><br />
                    Nội dung: <b>{receipt.id || 'tên + số điện thoại'}</b>
                  </p>
                  <small>Quán sẽ xác nhận khi nhận được tiền.</small>
                </>
              )}
            </div>
          )}

          {/* ===== Bước thanh toán ===== */}
          {!receipt && step === 'pay' && (
            <>
              {lines.map(({ p, qty }) => (
                <div className="hm-line" key={p.id}>
                  <div>
                    <b>{p.name}</b>
                    <small>{money(p.price)} × {qty} = {money(p.price * qty)}</small>
                  </div>
                </div>
              ))}

              <label style={lab}>
                Họ tên
                <input style={field} value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} placeholder="Nguyễn Văn A" />
              </label>
              <label style={lab}>
                Số điện thoại
                <input
                  style={field}
                  inputMode="tel"
                  value={info.phone}
                  onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                  placeholder="09xx xxx xxx"
                />
                {info.phone && !phoneOk && <small style={{ color: '#b3382c' }}>Số điện thoại chưa hợp lệ</small>}
                {user?.phone && info.phone === user.phone && (
                  <small>Số điện thoại bạn đã đăng ký, có thể đổi cho đơn này.</small>
                )}
              </label>
              <label style={lab}>
                Nhận món
                <select style={field} value={place} onChange={(e) => setPlace(e.target.value)}>
                  {places.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>

              <div style={lab}>
                Hình thức thanh toán
                <div className="hm-seg" style={{ marginTop: 6 }}>
                  {(['Tiền mặt', 'Chuyển khoản'] as const).map((m) => (
                    <button key={m} className={info.method === m ? 'on' : ''} onClick={() => setInfo({ ...info, method: m })}>
                      {m === 'Tiền mặt' ? '💵 Tiền mặt' : '🏦 Chuyển khoản'}
                    </button>
                  ))}
                </div>
                <small style={{ display: 'block', marginTop: 6 }}>
                  {info.method === 'Tiền mặt'
                    ? 'Thanh toán tại quầy khi nhận món.'
                    : 'Thông tin tài khoản sẽ hiện sau khi bạn đặt hàng.'}
                </small>
              </div>

              <label style={lab}>
                Ghi chú cho quán
                <textarea
                  style={field}
                  rows={2}
                  value={info.note}
                  onChange={(e) => setInfo({ ...info, note: e.target.value })}
                  placeholder="Ít đá, ít đường..."
                />
              </label>
            </>
          )}

          {/* ===== Giỏ hàng ===== */}
          {!receipt && step === 'cart' && (
            <>
              {lines.length === 0 && <p className="hm-empty">Chưa có món nào.</p>}
              {lines.map(({ p, qty }) => (
                <div className="hm-line" key={p.id}>
                  <div>
                    <b>{p.name}</b>
                    <small>{money(p.price)} × {qty} = {money(p.price * qty)}</small>
                  </div>
                  <div className="hm-qty">
                    <button onClick={() => add(p.id, -1)}>−</button>
                    <span>{qty}</span>
                    <button onClick={() => add(p.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="hm-cart-f">
          {receipt ? (
            <button className="hm-btn full" onClick={() => { setReceipt(null); setStep('cart'); closeCart() }}>Đóng</button>
          ) : step === 'pay' ? (
            <>
              <div className="hm-total"><span>Tổng thanh toán</span><b>{money(total)}</b></div>
              <button className="hm-btn full" disabled={!canSubmit} onClick={submitOrder}>
                {sending ? 'Đang gửi...' : 'Xác nhận đặt hàng'}
              </button>
              <button className="hm-btn ghost full" disabled={sending} onClick={() => setStep('cart')}>← Quay lại giỏ hàng</button>
            </>
          ) : (
            <>
              <div className="hm-total"><span>Tạm tính</span><b>{money(total)}</b></div>
              <button className="hm-btn full" disabled={!count || !isOpen} onClick={goPay}>
                {isOpen ? 'Thanh toán' : 'Quán đang đóng cửa'}
              </button>
              <button className="hm-btn ghost full" disabled={!count} onClick={() => setCart({})}>Xóa giỏ hàng</button>
              <small>Hoặc đưa giỏ hàng này cho nhân viên tại quầy để gọi món.</small>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}