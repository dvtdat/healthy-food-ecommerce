# AI Recommendation System Plan

## What data we already have

| Signal                        | Source                         | Strength |
| ----------------------------- | ------------------------------ | -------- |
| Co-purchase (bought together) | `OrderItem` → same `Order`     | Strong   |
| Explicit rating               | `Review.rating`                | Strong   |
| Category taxonomy             | `Product.category`             | Medium   |
| Implicit interest             | `CartItem` (not purchased yet) | Medium   |
| Purchase history per user     | `OrderItem` → `Order.user`     | Strong   |

The foundation is already there. No new data is strictly needed for Phase 1.

---

## Three-Phase Approach

### Phase 1 — Pure MongoDB Aggregation (no AI, build now)

### Phase 2 — Embedding-Based Semantic Similarity (light AI)

### Phase 3 — Claude-Powered Personalized Recommendations (full AI)

---

## Phase 1: MongoDB Aggregation Recommendations

No external dependencies. All logic lives in a `RecommendationModule` that queries existing collections.

### New module structure

```
src/modules/recommendation/
├── recommendation.module.ts
├── recommendation.controller.ts
└── recommendation.service.ts
```

### New endpoints

| Endpoint                            | Auth   | Description                                        |
| ----------------------------------- | ------ | -------------------------------------------------- |
| `GET /products/trending`            | Public | Most ordered in last 30 days                       |
| `GET /products/top-rated`           | Public | Highest avg review score (min 3 reviews)           |
| `GET /products/:id/related`         | Public | Other products in same category, ordered by rating |
| `GET /products/:id/bought-together` | Public | Products most frequently bought in same order      |
| `GET /products/recommended`         | JWT    | Personalized — based on user's order history       |

### Aggregation logic

**Trending** — count OrderItems grouped by product, last 30 days:

```
OrderItem collection
  → filter: order.createdAt >= 30 days ago
  → group by productId, sum quantity
  → sort by total desc
  → limit 10
  → populate product
```

**Frequently bought together** — co-occurrence matrix:

```
Given productId P:
  1. Find all orderId values that contain P
  2. Find all other productIds in those same orders
  3. Group by productId, count co-occurrences
  4. Sort desc, limit 5
```

**Personalized** — category affinity from order history:

```
Given userId U:
  1. Find all products U has ordered → extract their categoryIds
  2. Rank categories by frequency (most ordered from first)
  3. Surface top-rated products from those categories that U hasn't ordered yet
  4. Fall back to trending if no order history
```

### Entity addition: denormalized counters on Product (optional, for performance)

If aggregation queries become slow under load, add these fields to `Product` and update them via a background job or event:

```typescript
@Property({ type: 'number', default: 0 })
orderCount: number = 0;

@Property({ type: 'number', nullable: true })
avgRating?: number;

@Property({ type: 'number', default: 0 })
reviewCount: number = 0;
```

Update `avgRating` and `reviewCount` in `ReviewService` on create/update/delete.
Update `orderCount` in `OrderService` when an order is confirmed.

---

## Phase 2: Embedding-Based Semantic Similarity

Uses an embedding model to find semantically similar products — e.g. "organic broccoli" → surfaces "organic spinach", "fresh kale", not just same-category products.

### Dependency

```bash
yarn add @anthropic-ai/sdk
# or for a dedicated embedding model:
yarn add openai  # text-embedding-3-small is cheap and fast
```

Anthropic doesn't expose a standalone embedding endpoint — use **OpenAI `text-embedding-3-small`** (1536 dims, ~$0.02/1M tokens) or **Cohere embed** for this. Claude is used in Phase 3.

### Entity change: add embedding to Product

```typescript
// product.entity.ts
@Property({ nullable: true, type: 'array' })
embedding?: number[];  // 1536-dim float array for text-embedding-3-small
```

MongoDB stores this as a native array. For vector search, use **MongoDB Atlas Vector Search** (free tier available) — no separate vector DB needed.

### MongoDB Atlas Vector Search index

Create via Atlas UI or CLI on the `product` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

### EmbeddingService

```typescript
// src/modules/recommendation/embedding.service.ts
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return res.data[0].embedding;
  }

  buildProductText(product: Product): string {
    // Combine the fields that carry semantic meaning
    return [product.name, product.description, product.category.name]
      .filter(Boolean)
      .join('. ');
  }
}
```

### When to generate embeddings

- On `POST /products` (create) — generate and store embedding
- On `PATCH /products/:id` (update name/description) — regenerate embedding
- One-time backfill script for existing products

### Semantic similarity query

```typescript
// In RecommendationService
async findSimilar(productId: string, limit = 5): Promise<Product[]> {
  const product = await this.productRepo.findOneOrFail(productId);
  if (!product.embedding) return this.findRelatedByCategory(productId, limit);

  // Atlas vector search via native driver
  return this.em.aggregate(Product, [
    {
      $vectorSearch: {
        index: 'product_embedding_index',
        path: 'embedding',
        queryVector: product.embedding,
        numCandidates: 50,
        limit: limit + 1, // +1 to exclude self
      },
    },
    { $match: { _id: { $ne: product._id }, deletedAt: null } },
    { $limit: limit },
  ]);
}
```

### New env var

```env
OPENAI_API_KEY=sk-...
```

---

## Phase 3: Claude-Powered Personalized Recommendations

Claude reads the user's purchase/review history and the product catalog, then returns a ranked list with natural language reasoning. Best used for a "For You" section with explanations.

### Dependency

```bash
yarn add @anthropic-ai/sdk
```

### New env var

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Endpoint

```
GET /products/for-you
Auth: JWT required
Response: { products: Product[], reasoning: string }
```

### ClaudeRecommendationService

```typescript
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeRecommendationService {
  private readonly claude: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly productRepo: EntityRepository<Product>,
    private readonly orderItemRepo: EntityRepository<OrderItem>,
  ) {
    this.claude = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
  }

  async getForYou(
    userId: string,
  ): Promise<{ productIds: string[]; reasoning: string }> {
    // 1. Gather context
    const orderItems = await this.orderItemRepo.find(
      { order: { user: userId } },
      { populate: ['product', 'product.category'] },
    );

    const allProducts = await this.productRepo.find(
      { deletedAt: null, stock: { $gt: 0 } },
      { populate: ['category'] },
    );

    const purchasedIds = new Set(
      orderItems.map((i) => i.product._id.toString()),
    );
    const availableProducts = allProducts.filter(
      (p) => !purchasedIds.has(p._id.toString()),
    );

    // 2. Build prompt
    const historyText = orderItems
      .map(
        (i) =>
          `- ${i.product.name} (${i.product.category.name}), qty: ${i.quantity}`,
      )
      .join('\n');

    const catalogText = availableProducts
      .map(
        (p) =>
          `[${p._id}] ${p.name} — ${p.category.name} — ${p.description ?? 'no description'}`,
      )
      .join('\n');

    const message = await this.claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a healthy food recommendation assistant. Based on the user's purchase history, recommend up to 5 products from the catalog they haven't bought yet.

PURCHASE HISTORY:
${historyText || 'No purchases yet.'}

AVAILABLE PRODUCTS (format: [id] name — category — description):
${catalogText}

Reply with valid JSON only:
{
  "productIds": ["<id1>", "<id2>", ...],
  "reasoning": "One sentence explaining why these fit the user."
}`,
        },
      ],
    });

    const raw = (message.content[0] as { text: string }).text;
    return JSON.parse(raw);
  }
}
```

### Cost & latency considerations

- Claude call per `/for-you` request is slow (~2–5s) and costs tokens
- **Cache the result** per user with a 1-hour TTL (use an in-memory Map or Redis)
- Limit catalog size sent to Claude — send top 50 available products by rating, not the entire catalog
- Only call Claude if the user has at least 1 past order; fall back to Phase 1 trending otherwise

---

## New entity: ProductView (optional, improves all phases)

Tracking views gives implicit interest signals beyond what cart/orders provide.

```typescript
// src/entities/product-view/product-view.entity.ts
@Entity()
export class ProductView extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  user?: User; // null for guest

  @ManyToOne(() => Product)
  product!: Product;

  @Property()
  viewedAt: Date = new Date();
}
```

Log a view whenever `GET /products/:id` is called (via an async fire-and-forget call in the controller — don't block the response).

Use `ProductView` to:

- Boost trending score (views + orders combined)
- Improve Phase 3 context (Claude sees "viewed but didn't buy" as a signal)

---

## Summary: what to build now

| Phase                         | Effort | Dependencies                           | Impact                                                         |
| ----------------------------- | ------ | -------------------------------------- | -------------------------------------------------------------- |
| Phase 1 — Aggregation         | Low    | None (uses existing data)              | Immediate — trending, bought-together, personalized by history |
| Phase 1b — ProductView entity | Low    | None                                   | Richer signals for all future phases                           |
| Phase 2 — Embeddings          | Medium | OpenAI API + Atlas Vector Search index | Semantic "similar products"                                    |
| Phase 3 — Claude              | Medium | Anthropic API                          | Personalized "For You" with reasoning                          |

**Recommended order:** Phase 1 → Phase 1b → Phase 3 (Claude is faster to wire up than setting up Atlas Vector Search) → Phase 2.

## New env vars summary

```env
# Phase 2
OPENAI_API_KEY=sk-...

# Phase 3
ANTHROPIC_API_KEY=sk-ant-...
```
