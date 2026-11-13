import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import * as d from './data'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function api<R = any>(path: string, method = 'GET', body?: unknown): Promise<R> {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`)
  return res.json()
}

type Item = { id: number | string }

// Danh sách đồng bộ với back end: mỗi lần thêm / sửa / xóa trong state sẽ tự gọi API tương ứng
function useApiList<T extends Item>(
  path: string,
  initial: T[],
  opts?: { update?: (next: T, prev: T) => Promise<unknown>; onSynced?: () => void },
) {
  const [list, setList] = useState<T[]>(initial)
  const [error, setError] = useState(false)
  const ref = useRef<T[]>(initial)

  // đổi state tại chỗ, không gọi API
  const setRaw: Dispatch<SetStateAction<T[]>> = (u) => {
    const next = typeof u === 'function' ? (u as (p: T[]) => T[])(ref.current) : u
    ref.current = next
    setList(next)
  }

  const reload = () =>
    api<T[]>(path)
      .then((data) => {
        setRaw(data)
        setError(false)
      })
      .catch((e) => {
        setError(true)
        console.warn('Không tải được ' + path + ' (back end đã chạy chưa?)', e)
      })

  useEffect(() => {
    reload()
  }, [])

  // đổi state và đồng bộ lên back end
  const set: Dispatch<SetStateAction<T[]>> = (u) => {
    const prev = ref.current
    const next = typeof u === 'function' ? (u as (p: T[]) => T[])(prev) : u
    setRaw(next)

    const prevMap = new Map(prev.map((x) => [x.id, x]))
    const nextIds = new Set(next.map((x) => x.id))
    const jobs: Promise<unknown>[] = []

    for (const p of prev) {
      if (!nextIds.has(p.id)) jobs.push(api(`${path}/${p.id}`, 'DELETE'))
    }
    for (const n of next) {
      const p = prevMap.get(n.id)
      if (!p) {
        const body: any = { ...n }
        delete body.id
        jobs.push(
          api<T>(path, 'POST', body).then((saved) =>
            setRaw((l) => l.map((x) => (x.id === n.id ? saved : x))),
          ),
        )
      } else if (JSON.stringify(p) !== JSON.stringify(n)) {
        jobs.push(opts?.update ? opts.update(n, p) : api(`${path}/${n.id}`, 'PUT', n))
      }
    }

    if (jobs.length) {
      Promise.all(jobs)
        .then(() => {
          setError(false)
          opts?.onSynced?.()
        })
        .catch((e) => {
          console.error(e)
          setError(true)
          reload() // lỗi thì tải lại dữ liệu thật từ back end
        })
    }
  }

  return { list, set, setRaw, reload, error }
}

function useStoreState() {
  const products = useApiList<d.Product>('/products', d.products)
  const orders = useApiList<d.Order>('/orders', d.orders, {
    // đổi trạng thái đơn thì gọi PATCH để back end cộng số lượng đã bán;
    // nếu đồng thời đổi thanh toán / lý do huỷ thì gọi thêm PUT để lưu các trường đó
    update: async (n, p) => {
      if (n.status !== p.status) await api(`/orders/${n.id}/status`, 'PATCH', { status: n.status })
      const extra =
        n.paid !== p.paid || n.payMethod !== p.payMethod || n.cancelReason !== p.cancelReason
      if (n.status === p.status || extra) await api(`/orders/${n.id}`, 'PUT', n)
    },
    onSynced: () => products.reload(),
  })
  const tables = useApiList<d.Table>('/tables', d.tables)
  const stock = useApiList<d.Stock>('/stock', d.stock)
  const staff = useApiList<d.Staff>('/staff', d.staff)
  const customers = useApiList<d.Customer>('/customers', d.customers)

  const addOrder = async (table: string, lines: d.OrderLine[]) => {
    try {
      // back end tự tạo mã đơn, giờ và tổng tiền
      const created = await api<d.Order>('/orders', 'POST', { table, lines, staff: 'Minh Anh' })
      orders.setRaw((o) => [created, ...o])
      tables.set((t) => t.map((x) => (x.name === table ? { ...x, status: 'Có khách' } : x)))
      return true
    } catch (e) {
      console.error(e)
      alert('Không tạo được đơn. Back end (localhost:3000) đã chạy chưa?')
      return false
    }
  }

  // tải lại toàn bộ dữ liệu từ back end
  const reloadAll = () => {
    products.reload()
    orders.reload()
    tables.reload()
    stock.reload()
    staff.reload()
    customers.reload()
  }

  // true khi có ít nhất một danh sách không tải/đồng bộ được với back end
  const offline = [products, orders, tables, stock, staff, customers].some((x) => x.error)

  return {
    products: products.list,
    setProducts: products.set,
    orders: orders.list,
    setOrders: orders.set,
    tables: tables.list,
    setTables: tables.set,
    stock: stock.list,
    setStock: stock.set,
    staff: staff.list,
    setStaff: staff.set,
    customers: customers.list,
    setCustomers: customers.set,
    addOrder,
    reloadAll,
    offline,
  }
}

const Ctx = createContext<ReturnType<typeof useStoreState> | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreState()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore phải nằm trong StoreProvider')
  return v
}