export interface Product { id: number; name: string; cat: string; price: number; active: boolean; sold: number }
export interface OrderLine { id: number; qty: number }
export type OrderStatus = 'Chờ pha chế' | 'Đang pha' | 'Hoàn thành' | 'Đã huỷ'
export type PayMethod = 'Tiền mặt' | 'Chuyển khoản'
export interface Order {
  id: string; table: string; lines: OrderLine[]; status: OrderStatus; time: string; staff: string; total: number
  paid?: boolean; payMethod?: PayMethod; cancelReason?: string
  customer?: string; phone?: string; note?: string // khách đặt qua web
}
export type TableStatus = 'Trống' | 'Có khách' | 'Đã đặt'
export interface Table { id: number; name: string; seats: number; status: TableStatus }
export interface Stock { id: number; name: string; unit: string; qty: number; min: number; max: number; supplier: string }
export interface Staff { id: number; name: string; role: string; shift: string; phone: string; active: boolean }
export interface Customer { id: number; name: string; phone: string; visits: number; spent: number; last: string }

export const products: Product[] = [
  { id: 1, name: 'Cà phê sữa đá', cat: 'Cà phê', price: 29000, active: true, sold: 412 },
  { id: 2, name: 'Bạc xỉu', cat: 'Cà phê', price: 32000, active: true, sold: 268 },
  { id: 3, name: 'Espresso', cat: 'Cà phê', price: 35000, active: true, sold: 97 },
  { id: 4, name: 'Cappuccino', cat: 'Cà phê', price: 45000, active: true, sold: 154 },
  { id: 5, name: 'Cold brew cam sả', cat: 'Cà phê', price: 49000, active: true, sold: 121 },
  { id: 6, name: 'Trà đào cam sả', cat: 'Trà', price: 42000, active: true, sold: 233 },
  { id: 7, name: 'Trà vải', cat: 'Trà', price: 39000, active: true, sold: 142 },
  { id: 8, name: 'Matcha latte', cat: 'Trà', price: 49000, active: true, sold: 176 },
  { id: 9, name: 'Sinh tố bơ', cat: 'Sinh tố', price: 45000, active: true, sold: 88 },
  { id: 10, name: 'Sinh tố xoài', cat: 'Sinh tố', price: 42000, active: false, sold: 64 },
  { id: 11, name: 'Bánh croissant', cat: 'Bánh', price: 35000, active: true, sold: 119 },
  { id: 12, name: 'Tiramisu', cat: 'Bánh', price: 52000, active: true, sold: 73 },
]

export const priceOf = (list: Product[], id: number) => list.find((p) => p.id === id)?.price ?? 0

const mk = (id: string, table: string, l: [number, number][], status: OrderStatus, time: string, staff: string): Order => {
  const lines = l.map(([i, qty]) => ({ id: i, qty }))
  return { id, table, lines, status, time, staff, total: lines.reduce((s, x) => s + priceOf(products, x.id) * x.qty, 0) }
}

export const orders: Order[] = [
  mk('DH1042', 'Bàn 3', [[1, 2], [11, 1]], 'Đang pha', '14:32', 'Minh Anh'),
  mk('DH1041', 'Mang đi', [[8, 1]], 'Chờ pha chế', '14:28', 'Thảo Vy'),
  mk('DH1040', 'Bàn 6', [[6, 2], [12, 2]], 'Hoàn thành', '14:05', 'Minh Anh'),
  mk('DH1039', 'Bàn 1', [[4, 1], [2, 1]], 'Hoàn thành', '13:48', 'Thảo Vy'),
  mk('DH1038', 'Bàn 8', [[5, 3]], 'Hoàn thành', '13:20', 'Quốc Bảo'),
  mk('DH1037', 'Mang đi', [[1, 1], [7, 1]], 'Đã huỷ', '12:55', 'Thảo Vy'),
  mk('DH1036', 'Bàn 2', [[9, 1], [3, 2]], 'Hoàn thành', '12:30', 'Quốc Bảo'),
]

export const tables: Table[] = [
  { id: 1, name: 'Bàn 1', seats: 2, status: 'Trống' },
  { id: 2, name: 'Bàn 2', seats: 2, status: 'Trống' },
  { id: 3, name: 'Bàn 3', seats: 4, status: 'Có khách' },
  { id: 4, name: 'Bàn 4', seats: 4, status: 'Đã đặt' },
  { id: 5, name: 'Bàn 5', seats: 4, status: 'Trống' },
  { id: 6, name: 'Bàn 6', seats: 6, status: 'Có khách' },
  { id: 7, name: 'Bàn 7', seats: 6, status: 'Trống' },
  { id: 8, name: 'Bàn 8', seats: 2, status: 'Có khách' },
  { id: 9, name: 'Sân vườn 1', seats: 4, status: 'Đã đặt' },
  { id: 10, name: 'Sân vườn 2', seats: 4, status: 'Trống' },
]

export const stock: Stock[] = [
  { id: 1, name: 'Hạt cà phê Robusta', unit: 'kg', qty: 14, min: 8, max: 40, supplier: 'Buôn Mê Roastery' },
  { id: 2, name: 'Hạt cà phê Arabica', unit: 'kg', qty: 6, min: 8, max: 30, supplier: 'Cầu Đất Farm' },
  { id: 3, name: 'Sữa tươi', unit: 'lít', qty: 22, min: 15, max: 60, supplier: 'Vinamilk' },
  { id: 4, name: 'Sữa đặc', unit: 'lon', qty: 9, min: 10, max: 48, supplier: 'Ông Thọ' },
  { id: 5, name: 'Bột matcha', unit: 'kg', qty: 2, min: 1, max: 6, supplier: 'Uji Việt' },
  { id: 6, name: 'Trà đào túi lọc', unit: 'hộp', qty: 18, min: 6, max: 30, supplier: 'Phúc Long' },
  { id: 7, name: 'Ly nhựa 500ml', unit: 'cái', qty: 640, min: 500, max: 2000, supplier: 'Bao bì Á Châu' },
  { id: 8, name: 'Đường cát', unit: 'kg', qty: 25, min: 10, max: 50, supplier: 'Biên Hoà' },
]

export const staff: Staff[] = [
  { id: 1, name: 'Nguyễn Minh Anh', role: 'Quản lý', shift: 'Sáng (6h–12h)', phone: '0903 112 233', active: true },
  { id: 2, name: 'Trần Thảo Vy', role: 'Thu ngân', shift: 'Chiều (12h–18h)', phone: '0912 445 566', active: true },
  { id: 3, name: 'Lê Quốc Bảo', role: 'Pha chế', shift: 'Chiều (12h–18h)', phone: '0938 778 899', active: true },
  { id: 4, name: 'Phạm Gia Hân', role: 'Pha chế', shift: 'Sáng (6h–12h)', phone: '0977 201 302', active: true },
  { id: 5, name: 'Võ Đức Long', role: 'Phục vụ', shift: 'Tối (18h–23h)', phone: '0986 334 455', active: true },
  { id: 6, name: 'Đỗ Ngọc Trâm', role: 'Phục vụ', shift: 'Tối (18h–23h)', phone: '0345 667 788', active: false },
]

export const customers: Customer[] = [
  { id: 1, name: 'Hoàng Nam', phone: '0901 234 567', visits: 48, spent: 2140000, last: '30/10/2026' },
  { id: 2, name: 'Lan Phương', phone: '0912 876 543', visits: 36, spent: 1780000, last: '29/10/2026' },
  { id: 3, name: 'Tuấn Kiệt', phone: '0935 111 222', visits: 22, spent: 960000, last: '27/10/2026' },
  { id: 4, name: 'Bích Ngọc', phone: '0988 456 789', visits: 15, spent: 720000, last: '25/10/2026' },
  { id: 5, name: 'Đăng Khoa', phone: '0977 654 321', visits: 9, spent: 410000, last: '22/10/2026' },
  { id: 6, name: 'Mai Anh', phone: '0369 852 147', visits: 4, spent: 185000, last: '18/10/2026' },
]

export const week = [
  { l: 'T2', v: 4120000 }, { l: 'T3', v: 3680000 }, { l: 'T4', v: 4350000 }, { l: 'T5', v: 4890000 },
  { l: 'T6', v: 5240000 }, { l: 'T7', v: 6710000 }, { l: 'CN', v: 7180000 },
]
export const month = [
  { l: 'Tuần 1', v: 31200000 }, { l: 'Tuần 2', v: 33900000 }, { l: 'Tuần 3', v: 29800000 }, { l: 'Tuần 4', v: 36170000 },
]