# Technical Presentation — Healthy Food E-Commerce

### CO3027 Electronic Commerce Assignment

---

## 1. System Overview

**Model:** B2C (Business-to-Consumer)

**Core user flow:**

```
Browse Products → Add to Cart → Create Order → Bank Transfer → Webhook Confirms → Ship
```

**Actors:**
| Role | Capabilities |
|---|---|
| Guest | Browse products, categories |
| User | Cart, orders, reviews, profile |
| Admin | Full CRUD on products/categories, order management, user management |

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

- Register with email + password
- Login → receive JWT access token + refresh token
- Token refresh without re-login
- Google OAuth (wired, extendable)
- Role-based access: `GUEST / USER / ADMIN`
- Admin can ban/unban users

### 2.2 Product Catalog

- Browse products with pagination
- Filter products by category
- Lookup by ID or slug (SEO-friendly URLs)
- Each product: name, slug, description, price, stock, images, category, attributes
- Soft delete (no hard removal from DB)

### 2.3 Category Management

- Hierarchical categories with slugs
- Admin: create, update, delete
- Public: list, get by ID or slug

### 2.4 Shopping Cart

- Auto-create cart on first access (per user)
- Add/update/remove items
- Stock validation before add
- Clear entire cart

### 2.5 Order Management

- Create order from selected items
- Stock validated and decremented at order creation
- Order status lifecycle: `PENDING → CONFIRMED → SHIPPED → DELIVERED / CANCELLED`
- Full status history with timestamps and notes
- Shipping tracking: `trackingNumber`, `courierName`, `estimatedDeliveryDate`
- Admin: filter orders by status and/or user

### 2.6 Payment Integration (Casso)

- Bank transfer payment method
- User pays with structured memo: `THANHTOAN <orderId>`
- Casso webhook detects transfer, notifies system
- System validates signature, matches order, confirms payment
- Payment record persisted: transaction ID, amount, bank, account, timestamp

### 2.7 Reviews

- Authenticated users leave one review per product
- Owner can update/delete their review
- Public can list reviews by product

### 2.8 Image Storage

- Product images uploaded to AWS S3
- Pre-signed URLs for secure access

### 2.9 Admin Capabilities

- User list with `orderCount` + `totalSpent` aggregates
- Order list with full payment details
- User's order history by user ID

---

## 3. Non-Functional Requirements

### 3.1 Security

| Concern           | Implementation                                                      |
| ----------------- | ------------------------------------------------------------------- |
| Authentication    | JWT (HS256), access + refresh token pair                            |
| Password storage  | bcrypt (adaptive hashing)                                           |
| PII protection    | AES-256 field-level encryption on `firstName`, `lastName`           |
| Webhook integrity | `Secure-Token` header validation on every Casso POST                |
| Authorization     | `JwtAuthGuard` + `RoleGuard` applied per route                      |
| CORS              | Configured allowlist — localhost in dev, production origins via env |
| Transport         | HTTPS enforced in production via Nginx + Let's Encrypt              |

### 3.2 Data Integrity

- Soft deletes — no data ever permanently removed
- Stock decrement is atomic per order creation
- All list queries filter `deletedAt: null`
- Casso webhook handler is idempotent (safe to re-deliver)

### 3.3 API Design

- RESTful conventions
- Consistent paginated response shape: `{ data, total, pageSize, pageNumber, totalPages }`
- Swagger auto-generated at `/api`
- DTO validation via `class-validator` at all entry points

### 3.4 Code Quality

- TypeScript strict mode
- ESLint + Prettier enforced
- Husky pre-commit: lint + format
- Husky pre-push: lint + typecheck + build (must all pass)
- Conventional commits enforced via commitlint

### 3.5 Developer Experience

- Watch mode dev server (`nest start --watch`)
- ngrok auto-tunnel for local webhook testing
- Seed script for initial data
- Swagger schema export (`yarn swagger:generate`)

---

## 4. Tech Stack

### Backend

| Layer        | Technology                          | Version   |
| ------------ | ----------------------------------- | --------- |
| Framework    | NestJS                              | 11        |
| Language     | TypeScript                          | 5.7       |
| Runtime      | Node.js                             | 20 LTS    |
| ORM          | MikroORM (MongoDB driver)           | 6.5       |
| Database     | MongoDB Atlas                       | M0 (free) |
| Auth         | Passport.js (local + JWT + Google)  | —         |
| Validation   | class-validator + class-transformer | —         |
| Encryption   | bcrypt + CryptoJS AES               | —         |
| File Storage | AWS S3 + S3 Request Presigner       | SDK v3    |
| API Docs     | @nestjs/swagger                     | 11        |
| Dev Tunnel   | @ngrok/ngrok                        | 1.7       |

### DevOps & Tooling

| Tool                | Purpose                          |
| ------------------- | -------------------------------- |
| Husky + lint-staged | Git hooks                        |
| commitlint          | Conventional commit enforcement  |
| ESLint + Prettier   | Code quality                     |
| Jest + Supertest    | Unit + E2E testing               |
| @swc/core           | Fast TypeScript compilation      |
| PM2                 | Process management in production |
| Nginx               | Reverse proxy + SSL termination  |
| GitHub Actions      | CI/CD (optional)                 |

---

## 5. System Architecture

```
┌──────────────────────────────────────────────┐
│               Client (Browser/App)           │
└──────────────────┬───────────────────────────┘
                   │ HTTPS
┌──────────────────▼───────────────────────────┐
│         Nginx (port 80/443)                  │
│    Reverse proxy + SSL termination           │
└──────────────────┬───────────────────────────┘
                   │ http://localhost:3300
┌──────────────────▼───────────────────────────┐
│           NestJS Application                 │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ modules │ │ entities │ │    common/    │ │
│  │ (logic) │ │ (schema) │ │ (guards/enc.) │ │
│  └────┬────┘ └──────────┘ └───────────────┘ │
└───────┼──────────────────────────────────────┘
        │                          │
┌───────▼──────────┐    ┌──────────▼───────────┐
│  MongoDB Atlas   │    │      AWS S3           │
│  (M0 free tier)  │    │  (product images)    │
└──────────────────┘    └──────────────────────┘
        ▲
        │ Webhook POST
┌───────┴──────────┐
│  Casso (payment) │
└──────────────────┘
```

### Module Dependency Structure

```
modules/  →  entities/  →  common/
  (feature logic)  (data models)  (guards, encryption, utils)

No circular dependencies. Domain flows one direction.
```

---

## 6. Infrastructure & Deployment

### Production Stack

| Component        | Service                         | Cost               |
| ---------------- | ------------------------------- | ------------------ |
| API server       | AWS EC2 t2.micro (Ubuntu 22.04) | Free (AWS Educate) |
| Database         | MongoDB Atlas M0                | Free (512 MB)      |
| Image storage    | AWS S3                          | Free tier          |
| CDN/SSL          | Nginx + Let's Encrypt           | Free               |
| Process manager  | PM2                             | Free               |
| Frontend hosting | AWS Amplify or S3 + CloudFront  | Free tier          |

### Deployment Architecture

```
GitHub (main branch)
       │
       │ push → GitHub Actions
       ▼
EC2 t2.micro (us-east-1)
  ├── Nginx :80/:443   ← public entry point
  ├── NestJS :3300     ← internal only
  └── PM2              ← auto-restart, survives reboots
       │
       ▼
MongoDB Atlas M0       ← external, EC2 IP whitelisted
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# Trigger: push to main
# Steps: SSH into EC2 → git pull → yarn install → yarn build → pm2 restart
```

### Frontend Deployment Options

| Option           | Stack                  | Trade-off              |
| ---------------- | ---------------------- | ---------------------- |
| Amplify          | Auto CI/CD from GitHub | Easiest, least control |
| S3 + CloudFront  | Static hosting + CDN   | Best AWS experience    |
| Same EC2 + Nginx | Co-located with API    | Simple, no extra infra |

---

## 7. Key Technical Decisions

### 7.1 NestJS over Express directly

**Why:** Enforces modular structure via decorators and DI. Built-in guards, interceptors, and pipes map 1:1 to e-commerce concerns (auth, validation, roles). Scales from prototype to production without refactor.

### 7.2 MongoDB + MikroORM over SQL

**Why:** Product attributes vary per category (food products have nutrition info, expiry dates, certifications). MongoDB flexible schema avoids painful migrations. MikroORM adds type safety, Unit of Work pattern, and event subscribers for encryption.

### 7.3 Field-level AES encryption on PII

**Why:** Vietnamese law (Decree 13/2023/ND-CP) requires personal data protection. Encrypting `firstName` and `lastName` at the ORM subscriber level means no code path can forget to encrypt — it's automatic.

### 7.4 Soft deletes everywhere

**Why:** E-commerce requires audit trails. A deleted product may still be referenced by historical orders. `deletedAt` preserves referential integrity and allows data recovery without complex restore procedures.

### 7.5 Casso webhook over direct payment gateway

**Why:** Casso monitors Vietnamese bank accounts and sends real-time webhooks when transfers arrive. No need for VietQR/VNPAY merchant account. Suitable for student projects and small Vietnamese businesses. Tradeoff: relies on structured memo format for order matching.

### 7.6 JWT + Refresh token pattern

**Why:** Short-lived access tokens (1h) minimize breach exposure. Refresh tokens (7d) avoid forced re-login. Stateless — no session store needed, scales horizontally.

### 7.7 Stock managed at order creation, not cart

**Why:** Cart-level stock reservation requires TTL cleanup, distributed locks, and complex release logic. Deferred validation at order creation is simpler and correct for low-concurrency scenarios. Tradeoff: race condition possible under high load — acceptable for this scale.

### 7.8 AWS S3 for images

**Why:** Decouples file storage from compute. EC2 disk space is limited (8 GB free tier). S3 scales infinitely, pre-signed URLs enable direct browser-to-S3 upload without proxying through the API.

---

## 8. Advanced Features (Part 5)

### 8.1 Bank Transfer Payment with Webhook (Casso)

Real payment integration — not simulated. Matches Vietnamese banking norms (bank transfer is dominant payment method). Webhook flow is event-driven, idempotent.

### 8.2 AWS S3 Image Management

Production-grade file storage with pre-signed URL pattern. Separates storage concern from API.

### 8.3 Field-Level Encryption

PII protected at rest. Auto-applied by ORM subscriber — zero developer overhead per feature.

### 8.4 Structured Delivery Tracking

Full `statusHistory[]` on every order. Courier name, tracking number, estimated + actual delivery dates. Users can see full order lifecycle.

### 8.5 Extendable for AI Recommendations

Product entity has `attributes` (flexible schema). Foundation for content-based filtering. Adding a recommendation endpoint requires only a new module — no schema migration.

---

## 9. API Summary

| Domain     | Endpoints | Auth                            |
| ---------- | --------- | ------------------------------- |
| Auth       | 2         | Public / JWT                    |
| Users      | 7         | Public (register) / JWT / Admin |
| Categories | 6         | Public (read) / Admin (write)   |
| Products   | 6         | Public (read) / Admin (write)   |
| Cart       | 5         | JWT                             |
| Orders     | 6         | JWT / Admin                     |
| Reviews    | 4         | Public (read) / JWT (write)     |
| Webhook    | 1         | Secure-Token header             |

**Total: 37 endpoints**
Swagger UI: `https://api.yourdomain.com/api`

---

## 10. Security Checklist

- [x] Passwords hashed with bcrypt (not stored plain)
- [x] JWT signed with strong secrets (env var)
- [x] PII (names) AES-encrypted at rest
- [x] Webhook requests validated via `Secure-Token`
- [x] Role guards on all admin routes
- [x] Ownership checks on user-specific resources
- [x] CORS restricted to known origins
- [x] HTTPS enforced via Nginx + Let's Encrypt
- [x] No hard deletes — full audit trail
- [x] EC2 port 3300 not exposed publicly (proxied via Nginx)
- [x] MongoDB Atlas IP whitelist (EC2 Elastic IP only)
