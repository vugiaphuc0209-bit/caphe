import { Injectable } from '@nestjs/common'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export type ShopMode = 'auto' | 'open' | 'closed'
const FILE = join(process.cwd(), 'store-status.json')
const OPEN_HOUR = 6
const CLOSE_HOUR = 23 // giống SHOP.openHour / closeHour ở Home.tsx

@Injectable()
export class StoreStatusService {
  mode: ShopMode = 'auto'

  constructor() {
    if (existsSync(FILE)) {
      try {
        this.mode = JSON.parse(readFileSync(FILE, 'utf8')).mode
      } catch {}
    }
  }

  set(mode: ShopMode) {
    this.mode = mode
    writeFileSync(FILE, JSON.stringify({ mode }))
  }

  isOpen() {
    if (this.mode === 'open') return true
    if (this.mode === 'closed') return false
    const h = new Date().getHours()
    return h >= OPEN_HOUR && h < CLOSE_HOUR
  }
}