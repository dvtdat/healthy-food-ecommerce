# Implementation Plan — Healthy Food E-Commerce

Tracks remaining work for the full user flow and admin management features.
Check off items as they are completed.

---

## Already Implemented ✅

### Auth

- [x] Email + password login (`POST /auth/login`) — returns JWT + refresh token
- [x] Token refresh (`POST /auth/refresh`)

### User

- [x] User registration (`POST /users`)
- [x] Get current user profile (`GET /users/me`)
- [x] Get user by ID (`GET /users/:id`)
- [x] Update user (`PATCH /users/:id`)
- [x] Soft delete user (`DELETE /users/:id`)
- [x] Admin: list all users with pagination (`GET /users`)

### Category

- [x] Create category — admin (`POST /categories`)
- [x] List categories with pagination (`GET /categories`)
- [x] Get category by ID (`GET /categories/:id`)
- [x] Get category by slug (`GET /categories/slug/:slug`)
- [x] Update category — admin (`PATCH /categories/:id`)
- [x] Soft delete category — admin (`DELETE /categories/:id`)

### Product

- [x] Create product — admin (`POST /products`)
- [x] List products with pagination + category filter (`GET /products`)
- [x] Get product by ID (`GET /products/:id`)
- [x] Get product by slug (`GET /products/slug/:slug`)
- [x] Update product — admin (`PATCH /products/:id`)
- [x] Soft delete product — admin (`DELETE /products/:id`)

### Cart

- [x] Get or create cart (`GET /carts/me`)
- [x] Add item to cart (`POST /carts/items`)
- [x] Update item quantity (`PATCH /carts/items/:productId`)
- [x] Remove item from cart (`DELETE /carts/items/:productId`)
- [x] Clear entire cart (`DELETE /carts`)

### Order

- [x] Create order from items — validates stock, decrements product stock (`POST /orders`)
- [x] List all orders — admin, paginated (`GET /orders`)
- [x] List current user's orders (`GET /orders/me`)
- [x] Get order by ID — owner or admin (`GET /orders/:id`)
- [x] Update order status — admin (`PATCH /orders/:id/status`)
- [x] Cancel order (`DELETE /orders/:id`)

### Review

- [x] Create review — one per user per product (`POST /reviews`)
- [x] List reviews by product (`GET /reviews?productId=...`)
- [x] Update review — owner only (`PATCH /reviews/:id`)
- [x] Delete review — owner or admin (`DELETE /reviews/:id`)

### Payment

- [x] Casso webhook receiver (`POST /webhooks/casso`)
- [x] Signature validation via `CASSO_SECURE_TOKEN`
- [x] Order confirmation: PENDING → CONFIRMED on valid payment
- [x] ngrok auto-tunnel in dev for webhook testing

---

## Remaining Work

### Phase 1 — Security Fixes

- [x] **1.1** Add `JwtAuthGuard` + ownership check to `PATCH /users/:id` (currently unguarded — any caller can update any user)
- [x] **1.2** Add `isActive: boolean` field to `User` entity; block login if `isActive = false`
- [x] **1.3** Admin: ban / unban user (`PATCH /users/:id/status`)

---

### Phase 2 — Email / Notification System

- [ ] **2.1** Create `NotificationModule` with `EmailService` (Nodemailer or Resend via env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`)
- [ ] **2.2** Email verification on register — generate signed token, send email, activate via `POST /auth/verify-email?token=...`
- [ ] **2.3** Password reset — `POST /auth/forgot-password` → email link → `POST /auth/reset-password`
- [ ] **2.4** Order confirmation email — triggered from `WebhookService` after PENDING → CONFIRMED
- [ ] **2.5** Shipment notification email — triggered when order status → SHIPPED
- [ ] **2.6** Delivery notification email — triggered when order status → DELIVERED

---

### Phase 3 — Payment Records

- [x] **3.1** Create `Payment` entity — fields: `order` (ref), `cassoTransactionId`, `amount`, `bankName`, `accountNumber`, `description`, `confirmedAt`
- [x] **3.2** Persist `Payment` record in `WebhookService.processTransaction` on successful confirmation
- [x] **3.3** Populate `payment` relation on `GET /orders/:id` response
- [x] **3.4** Admin: `GET /orders/:id` returns full Casso transaction reference via payment relation

---

### Phase 4 — Order Delivery Tracking

- [x] **4.1** Add delivery fields to `Order` entity — `trackingNumber?`, `courierName?`, `estimatedDeliveryDate?`, `actualDeliveryDate?`
- [x] **4.2** Add embedded `statusHistory[]` to `Order` — `{ status, changedAt, note }` — append on every status change
- [x] **4.3** Update `PATCH /orders/:id/status` — require `trackingNumber` + `courierName` when transitioning to SHIPPED; set `actualDeliveryDate` on DELIVERED
- [x] **4.4** Return `statusHistory[]` in `GET /orders/:id` so user can see the full delivery timeline

---

### Phase 5 — Admin: User & Order Management

- [x] **5.1** Admin: list a user's orders — `GET /users/:id/orders` (paginated)
- [x] **5.2** Payment detail included in order response via populated `payment` field (covered by 3.3)
- [x] **5.3** Admin: `GET /users` response includes `orderCount` and `totalSpent` aggregates per user
- [x] **5.4** Admin: filter orders by status and/or userId — `GET /orders?status=PENDING&userId=...`

---

### Phase 6 — User Flow Polish

- [ ] **6.1** Clear cart automatically after `POST /orders` succeeds
- [ ] **6.2** Restore `product.stock` for each item when an order is CANCELLED
- [ ] **6.3** Reject order creation if any product is soft-deleted
- [ ] **6.4** Accept `shippingAddress` as structured object — `{ name, phone, street, city, province, zip }` instead of free text

---

### Phase 7 — Optional / Post-Launch

- [ ] **7.1** Complete Google OAuth — implement `GoogleStrategy` + callback endpoint
- [ ] **7.2** Product image upload — add `multer` + file storage (S3 or Cloudinary)
- [ ] **7.3** Coupon / discount — new `Coupon` entity, apply at checkout
- [ ] **7.4** Admin sales report — `GET /admin/reports` with revenue by date range

---

## Notes

- Phases 3–5 can be worked in parallel once Phase 2 is done.
- Phase 1 should be done before anything else — the unguarded PATCH is a live security issue.
- Google OAuth (7.1) should come after Phase 2 since both touch the auth flow.
