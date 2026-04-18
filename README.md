# Healthy Food E-Commerce API

A modular, role-based e-commerce REST API built with NestJS + MikroORM + MongoDB.

## Tech Stack

- **Framework:** NestJS 11, Express
- **Language:** TypeScript 5.7
- **ORM:** MikroORM 6.5 (MongoDB driver)
- **Auth:** Passport.js (local, JWT, Google OAuth)
- **Docs:** Swagger (`/api`)

## Setup

```bash
npm install
```

## Running

```bash
# development (watch mode)
npm run start:dev

# production build
npm run build
npm run start:prod
```

## Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

## Other Commands

```bash
npm run lint             # fix ESLint issues
npm run format           # fix formatting
npm run typecheck        # TypeScript type check
npm run pre-push         # lint + typecheck + build
npm run swagger:generate # generate OpenAPI schema
```

Swagger UI: `http://localhost:3300/api`

## Environment Variables

| Variable                 | Required | Purpose                          |
| ------------------------ | -------- | -------------------------------- |
| `DATABASE_URL`           | Yes      | MongoDB connection string        |
| `DATABASE_NAME`          | Yes      | Database name                    |
| `JWT_SECRET`             | Yes      | JWT signing key                  |
| `REFRESH_JWT_SECRET`     | Yes      | Refresh token signing key        |
| `ENCRYPTION_KEY`         | Yes      | AES key for user name encryption |
| `CASSO_SECURE_TOKEN`     | Yes      | Casso webhook signature token    |
| `PORT`                   | No       | HTTP port (default: `3300`)      |
| `JWT_EXPIRES_IN`         | No       | JWT expiry (default: `1h`)       |
| `REFRESH_JWT_EXPIRES_IN` | No       | Refresh token expiry             |
| `NGROK_AUTHTOKEN`        | No       | ngrok tunnel (dev only)          |
| `GEMINI_API_KEY`         | Yes      | Gemini API key (chatbot)         |

## API Modules

- `POST /auth/login` — login → JWT + refresh token
- `POST /auth/refresh` — refresh token
- `POST /users` — register (public)
- `GET /categories` — list categories (public)
- `GET /products` — list products (public)
- `POST /orders` — create order (authenticated)
- `GET /carts/me` — get cart (authenticated)
- `POST /reviews` — create review (authenticated)
- `POST /webhooks/casso` — payment webhook
- `POST /chatbot` — AI chatbot (authenticated)

See `http://localhost:3300/api` for full Swagger docs.

## Chatbot

The chatbot is powered by Gemini AI and acts as a shop assistant for HealthyFood.

**Endpoint:** `POST /chatbot`  
**Auth:** Bearer JWT required

**Request body:**

```json
{ "message": "câu hỏi hoặc yêu cầu của bạn" }
```

**Response:**

```json
{ "reply": "câu trả lời từ AI" }
```

**Capabilities:**

- Answer questions about products, prices, stock, categories
- Recommend combos based on budget or nutritional needs
- Show active vouchers and how to apply them
- Explain delivery options and shipping fees
- Add products to cart on behalf of the user (e.g. _"thêm Quinoa Power Bowl vào giỏ hàng"_)

**Chat history:** Conversations are persisted per user in MongoDB (last 10 messages). Older messages are automatically trimmed.

**Environment variable required:**

| Variable         | Required | Purpose        |
| ---------------- | -------- | -------------- |
| `GEMINI_API_KEY` | Yes      | Gemini API key |

## Payment Flow

1. User creates order → status `PENDING`
2. User pays via bank transfer with memo: `THANHTOAN <orderId>`
3. Casso webhook hits `POST /webhooks/casso`
4. If amount matches and status is `PENDING` → status becomes `CONFIRMED`

**Order status flow:** `PENDING` → `CONFIRMED` → `SHIPPED` → `DELIVERED` / `CANCELLED`
