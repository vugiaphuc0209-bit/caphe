"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreStatusService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const FILE = (0, path_1.join)(process.cwd(), 'store-status.json');
const OPEN_HOUR = 6;
const CLOSE_HOUR = 23; // giống SHOP.openHour / closeHour ở Home.tsx
let StoreStatusService = class StoreStatusService {
    constructor() {
        this.mode = 'auto';
        if ((0, fs_1.existsSync)(FILE)) {
            try {
                this.mode = JSON.parse((0, fs_1.readFileSync)(FILE, 'utf8')).mode;
            }
            catch { }
        }
    }
    set(mode) {
        this.mode = mode;
        (0, fs_1.writeFileSync)(FILE, JSON.stringify({ mode }));
    }
    isOpen() {
        if (this.mode === 'open')
            return true;
        if (this.mode === 'closed')
            return false;
        const h = new Date().getHours();
        return h >= OPEN_HOUR && h < CLOSE_HOUR;
    }
};
exports.StoreStatusService = StoreStatusService;
exports.StoreStatusService = StoreStatusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StoreStatusService);
