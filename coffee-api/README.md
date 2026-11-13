# coffee-api (back end Hạt Coffee House)

1. Tạo database trong MySQL Workbench:  CREATE DATABASE coffeedb CHARACTER SET utf8mb4;
2. Mở src/app.module.ts, sửa DB_PASSWORD đúng mật khẩu MySQL.
3. npm install
4. npm run start:dev   -> http://localhost:3000

API: /products /tables /stock /staff /customers (GET, GET/:id, POST, PUT/:id, DELETE/:id)
     /orders (GET, POST, PUT/:id, PATCH/:id/status, DELETE/:id)
     /stats (GET)
