# AI Recommendation System — Deep Dive

## Design Philosophy

The AI recommendation layer sits behind a **provider interface** — the backend and frontend agree on a fixed input/output contract, and the actual AI model (Claude, OpenAI, a local LLM, a fine-tuned model) is swapped via an env var. This means:

- The frontend never knows which model is running
- You can A/B test models
- You can fall back to a `MockProvider` during development or when API keys are missing
- Switching models requires zero interface changes

---

## Part 1: Schema Expansions

### 1a. User Health Profile (new `UserHealthProfile` embeddable)

Add as an embedded object on `User`. All fields optional — a user with no profile gets rule-based recommendations as a fallback.

```typescript
// src/entities/user/user-health-profile.embeddable.ts

import { Embeddable, Enum, Property } from '@mikro-orm/core';

export enum DietaryType {
  OMNIVORE = 'omnivore',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  PESCATARIAN = 'pescatarian',
  KETO = 'keto',
  PALEO = 'paleo',
}

export enum LifestyleTag {
  GYM = 'gym',
  PREGNANT = 'pregnant',
  DIABETIC = 'diabetic',
  HYPERTENSIVE = 'hypertensive',
  ELDERLY = 'elderly',
  STUDENT = 'student',
  ATHLETE = 'athlete',
}

export enum HealthGoal {
  LOSE_WEIGHT = 'lose_weight',
  GAIN_MUSCLE = 'gain_muscle',
  MAINTAIN = 'maintain',
  GUT_HEALTH = 'gut_health',
  BOOST_IMMUNITY = 'boost_immunity',
  INCREASE_ENERGY = 'increase_energy',
  SKIN_HEALTH = 'skin_health',
  HEART_HEALTH = 'heart_health',
}

export enum KnownAllergen {
  GLUTEN = 'gluten',
  DAIRY = 'dairy',
  NUTS = 'nuts',
  SHELLFISH = 'shellfish',
  EGGS = 'eggs',
  SOY = 'soy',
  FISH = 'fish',
}

@Embeddable()
export class UserHealthProfile {
  @Enum({ items: () => DietaryType, nullable: true })
  dietaryType?: DietaryType;

  @Property({ type: 'array', nullable: true })
  lifestyleTags?: LifestyleTag[];

  @Property({ type: 'array', nullable: true })
  healthGoals?: HealthGoal[];

  @Property({ type: 'array', nullable: true })
  allergens?: KnownAllergen[];

  @Property({ type: 'number', nullable: true })
  dailyCalorieTarget?: number; // kcal/day

  // IDs of categories the user explicitly prefers
  @Property({ type: 'array', nullable: true })
  preferredCategoryIds?: string[];

  // Free-text ingredients to avoid (beyond known allergens)
  @Property({ type: 'array', nullable: true })
  excludedIngredients?: string[];

  // Free-text context the user writes themselves — fed directly to the AI
  // e.g. "I'm training for a half-marathon in 3 months"
  @Property({ nullable: true })
  customNote?: string;
}
```

**Add to `User` entity:**

```typescript
@Embedded(() => UserHealthProfile, { nullable: true, object: true })
healthProfile?: UserHealthProfile;
```

---

### 1b. Product Nutritional Data

Two new embeddables added to `Product`.

```typescript
// src/entities/product/nutrition-facts.embeddable.ts

import { Embeddable, Property } from '@mikro-orm/core';

@Embeddable()
export class NutritionFacts {
  // Per serving
  @Property({ nullable: true })
  servingSize?: string; // e.g. "100g", "1 piece (200g)"

  @Property({ type: 'number', nullable: true })
  calories?: number; // kcal

  @Property({ type: 'number', nullable: true })
  protein?: number; // grams

  @Property({ type: 'number', nullable: true })
  carbohydrates?: number; // grams

  @Property({ type: 'number', nullable: true })
  fat?: number; // grams

  @Property({ type: 'number', nullable: true })
  fiber?: number; // grams

  @Property({ type: 'number', nullable: true })
  sugar?: number; // grams

  @Property({ type: 'number', nullable: true })
  sodium?: number; // milligrams

  // Key micronutrients
  @Property({ type: 'number', nullable: true })
  vitaminC?: number; // mg

  @Property({ type: 'number', nullable: true })
  vitaminA?: number; // mcg RAE

  @Property({ type: 'number', nullable: true })
  calcium?: number; // mg

  @Property({ type: 'number', nullable: true })
  iron?: number; // mg

  @Property({ type: 'number', nullable: true })
  potassium?: number; // mg

  @Property({ type: 'number', nullable: true })
  magnesium?: number; // mg
}
```

**Add to `Product` entity:**

```typescript
// Structured nutrition facts
@Embedded(() => NutritionFacts, { nullable: true, object: true })
nutrition?: NutritionFacts;

// Curated dietary tags — admins set these
// e.g. ['vegan', 'gluten-free', 'high-protein', 'keto-friendly', 'low-sodium']
@Property({ type: 'array', nullable: true })
dietaryTags?: string[];

// Known allergens present in this product
@Property({ type: 'array', nullable: true })
allergens?: KnownAllergen[];

// Full ingredient list (free text, as printed on label)
@Property({ nullable: true })
ingredients?: string;

// Short benefit statements written by admin, consumed by AI and displayed in UI
// e.g. ['rich in antioxidants', 'supports digestion', 'good post-workout']
@Property({ type: 'array', nullable: true })
healthBenefits?: string[];
```

---

### 1c. Category Health Tags

```typescript
// Add to Category entity:

// High-level health focus of this category
// e.g. ['high-protein', 'low-calorie', 'gut-health', 'anti-inflammatory']
@Property({ type: 'array', nullable: true })
healthTags?: string[];

// Lifestyle audiences this category is suitable for
// mirrors LifestyleTag enum values
@Property({ type: 'array', nullable: true })
targetAudience?: string[];
```

---

## Part 2: The Provider Interface (Model-Agnostic Contract)

This is the core of the architecture. Everything below is a TypeScript interface — no implementation yet.

### Input types

```typescript
// src/modules/recommendation/interfaces/recommendation.interface.ts

export interface UserRecommendationContext {
  healthProfile: {
    dietaryType?: string;
    lifestyleTags?: string[];
    healthGoals?: string[];
    allergens?: string[];
    dailyCalorieTarget?: number;
    excludedIngredients?: string[];
    customNote?: string;
  };
  // Aggregated from order history — top 10 most ordered
  purchaseHistory: {
    productName: string;
    categoryName: string;
    timesOrdered: number;
  }[];
  // Current cart contents
  cartItems: {
    productName: string;
    categoryName: string;
    quantity: number;
  }[];
}

export interface ProductRecommendationContext {
  id: string;
  name: string;
  category: string;
  categoryHealthTags?: string[];
  description?: string;
  ingredients?: string;
  healthBenefits?: string[];
  dietaryTags?: string[];
  allergens?: string[];
  nutrition?: {
    servingSize?: string;
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  price: number;
  avgRating?: number; // pre-computed before passing in
  orderCount?: number; // popularity signal
}

export interface RecommendationInput {
  user: UserRecommendationContext;
  candidates: ProductRecommendationContext[]; // pre-filtered, max 80 products
  limit: number; // how many to return
  query?: string; // optional natural language query from user
}
```

### Output types

```typescript
export interface RecommendedItem {
  productId: string;
  rank: number;
  score: number; // 0.0–1.0 confidence/relevance
  reason: string; // one sentence, shown directly under the product card
}

export interface RecommendationOutput {
  items: RecommendedItem[];
  summary: string; // 1–2 sentences explaining the overall selection
  nutritionInsight?: string; // e.g. "Prioritized high-protein options for your muscle-gain goal"
  warnings?: string[]; // e.g. "Some products contain dairy — check allergens before purchasing"
}
```

### Provider interface

```typescript
export interface RecommendationProvider {
  readonly name: string; // 'claude' | 'openai' | 'mock' | etc.
  recommend(input: RecommendationInput): Promise<RecommendationOutput>;
}
```

---

## Part 3: Provider Implementations

### File structure

```
src/modules/recommendation/
├── recommendation.module.ts
├── recommendation.controller.ts
├── recommendation.service.ts          # orchestration: builds input, calls provider, caches
├── interfaces/
│   └── recommendation.interface.ts    # all types above
└── providers/
    ├── recommendation-provider.token.ts  # NestJS injection token
    ├── mock.provider.ts               # deterministic, no API calls
    ├── claude.provider.ts             # Anthropic SDK
    └── openai.provider.ts             # OpenAI SDK
```

### Provider selection (via env)

```typescript
// recommendation.module.ts
const providerMap = {
  claude: ClaudeRecommendationProvider,
  openai: OpenAIRecommendationProvider,
  mock: MockRecommendationProvider,
};

const providerName = process.env.AI_RECOMMENDATION_PROVIDER ?? 'mock';
const ProviderClass = providerMap[providerName] ?? MockRecommendationProvider;

@Module({
  providers: [
    { provide: RECOMMENDATION_PROVIDER, useClass: ProviderClass },
    RecommendationService,
  ],
  ...
})
export class RecommendationModule {}
```

### MockProvider (always implement first)

```typescript
// providers/mock.provider.ts
@Injectable()
export class MockRecommendationProvider implements RecommendationProvider {
  readonly name = 'mock';

  async recommend(input: RecommendationInput): Promise<RecommendationOutput> {
    // Sort by avgRating desc, return top N
    const sorted = [...input.candidates]
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
      .slice(0, input.limit);

    return {
      items: sorted.map((p, i) => ({
        productId: p.id,
        rank: i + 1,
        score: parseFloat((1 - i * 0.1).toFixed(2)),
        reason: `Highly rated ${p.category} product.`,
      })),
      summary: 'Here are our top-rated products for you.',
      nutritionInsight: undefined,
      warnings: [],
    };
  }
}
```

### Claude provider (skeleton)

````typescript
// providers/claude.provider.ts
@Injectable()
export class ClaudeRecommendationProvider implements RecommendationProvider {
  readonly name = 'claude';
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
  }

  async recommend(input: RecommendationInput): Promise<RecommendationOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (message.content[0] as { text: string }).text;
    // Extract JSON from response (Claude may wrap it in markdown)
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? [null, text];
    return JSON.parse(jsonMatch[1]) as RecommendationOutput;
  }

  private buildSystemPrompt(): string {
    return `You are a nutritionist and healthy food recommendation assistant for a Vietnamese e-commerce platform.
Your role is to recommend food products that best match the user's health profile, dietary needs, and goals.

Rules:
- NEVER recommend products that contain an allergen the user listed
- Respect dietary type strictly (vegan users never get animal products)
- Prioritize health goals over popularity
- Keep each "reason" under 20 words, friendly and specific
- Always return valid JSON matching the schema exactly — no extra text outside the JSON block`;
  }

  private buildUserPrompt(input: RecommendationInput): string {
    const { user, candidates, limit, query } = input;

    const profileText = [
      user.healthProfile.dietaryType &&
        `Dietary type: ${user.healthProfile.dietaryType}`,
      user.healthProfile.lifestyleTags?.length &&
        `Lifestyle: ${user.healthProfile.lifestyleTags.join(', ')}`,
      user.healthProfile.healthGoals?.length &&
        `Goals: ${user.healthProfile.healthGoals.join(', ')}`,
      user.healthProfile.allergens?.length &&
        `Allergens to avoid: ${user.healthProfile.allergens.join(', ')}`,
      user.healthProfile.dailyCalorieTarget &&
        `Daily calorie target: ${user.healthProfile.dailyCalorieTarget} kcal`,
      user.healthProfile.excludedIngredients?.length &&
        `Excluded ingredients: ${user.healthProfile.excludedIngredients.join(', ')}`,
      user.healthProfile.customNote &&
        `User note: "${user.healthProfile.customNote}"`,
    ]
      .filter(Boolean)
      .join('\n');

    const historyText = user.purchaseHistory.length
      ? user.purchaseHistory
          .map(
            (h) => `- ${h.productName} (${h.categoryName}) ×${h.timesOrdered}`,
          )
          .join('\n')
      : 'No purchase history.';

    const cartText = user.cartItems.length
      ? user.cartItems
          .map((c) => `- ${c.productName} (${c.categoryName})`)
          .join('\n')
      : 'Empty cart.';

    const catalogText = candidates
      .map((p) => {
        const parts = [`[${p.id}] ${p.name} | Category: ${p.category}`];
        if (p.description) parts.push(`Description: ${p.description}`);
        if (p.dietaryTags?.length)
          parts.push(`Tags: ${p.dietaryTags.join(', ')}`);
        if (p.allergens?.length)
          parts.push(`Contains: ${p.allergens.join(', ')}`);
        if (p.healthBenefits?.length)
          parts.push(`Benefits: ${p.healthBenefits.join(', ')}`);
        if (p.nutrition) {
          const n = p.nutrition;
          const facts = [
            n.calories != null && `${n.calories}kcal`,
            n.protein != null && `protein ${n.protein}g`,
            n.carbohydrates != null && `carbs ${n.carbohydrates}g`,
            n.fat != null && `fat ${n.fat}g`,
            n.fiber != null && `fiber ${n.fiber}g`,
          ]
            .filter(Boolean)
            .join(', ');
          if (facts)
            parts.push(
              `Nutrition (per ${n.servingSize ?? 'serving'}): ${facts}`,
            );
        }
        if (p.avgRating) parts.push(`Rating: ${p.avgRating.toFixed(1)}/5`);
        return parts.join(' | ');
      })
      .join('\n');

    return `USER HEALTH PROFILE:
${profileText || 'No profile set.'}

PURCHASE HISTORY (most ordered):
${historyText}

CURRENT CART:
${cartText}

${query ? `USER QUERY: "${query}"\n` : ''}
AVAILABLE PRODUCTS (${candidates.length} total):
${catalogText}

Please recommend the top ${limit} products. Return ONLY valid JSON:
\`\`\`json
{
  "items": [
    { "productId": "<id>", "rank": 1, "score": 0.95, "reason": "<≤20 word reason>" }
  ],
  "summary": "<1-2 sentence overall summary>",
  "nutritionInsight": "<optional: how nutrition matches their goals>",
  "warnings": ["<optional allergen or dietary warnings>"]
}
\`\`\``;
  }
}
````

---

## Part 4: RecommendationService (Orchestration)

```typescript
// recommendation.service.ts

@Injectable()
export class RecommendationService {
  // Simple in-memory cache: userId → { output, expiresAt }
  private cache = new Map<
    string,
    { output: RecommendationOutput; expiresAt: number }
  >();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    @Inject(RECOMMENDATION_PROVIDER)
    private readonly provider: RecommendationProvider,
    private readonly productRepo: EntityRepository<Product>,
    private readonly orderItemRepo: EntityRepository<OrderItem>,
    private readonly cartRepo: EntityRepository<Cart>,
    private readonly reviewRepo: EntityRepository<Review>,
  ) {}

  async getRecommendations(
    userId: string,
    limit = 10,
    query?: string,
    excludeProductIds: string[] = [],
    bypassCache = false,
  ): Promise<RecommendationApiResponse> {
    const cacheKey = `${userId}:${limit}:${query ?? ''}`;

    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return this.toApiResponse(cached.output, userId, true);
      }
    }

    const input = await this.buildInput(
      userId,
      limit,
      query,
      excludeProductIds,
    );
    const output = await this.provider.recommend(input);

    this.cache.set(cacheKey, {
      output,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return this.toApiResponse(output, userId, false);
  }

  private async buildInput(
    userId: string,
    limit: number,
    query?: string,
    excludeProductIds: string[] = [],
  ): Promise<RecommendationInput> {
    // Fetch user with health profile
    const user = await this.userRepo.findOneOrFail(userId);

    // Fetch purchase history (top 10 most ordered products)
    const orderItems = await this.orderItemRepo.find(
      { order: { user: userId, status: { $ne: 'cancelled' } } },
      { populate: ['product', 'product.category'] },
    );
    const purchaseMap = new Map<
      string,
      { productName: string; categoryName: string; count: number }
    >();
    for (const item of orderItems) {
      const key = item.product._id.toString();
      const existing = purchaseMap.get(key);
      purchaseMap.set(key, {
        productName: item.product.name,
        categoryName: (item.product.category as Category).name,
        count: (existing?.count ?? 0) + item.quantity,
      });
    }
    const purchasedProductIds = new Set(purchaseMap.keys());
    const purchaseHistory = [...purchaseMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((h) => ({
        productName: h.productName,
        categoryName: h.categoryName,
        timesOrdered: h.count,
      }));

    // Fetch cart
    const cart = await this.cartRepo.findOne(
      { user: userId },
      { populate: ['items', 'items.product', 'items.product.category'] },
    );
    const cartItems = (cart?.items.getItems() ?? []).map((ci) => ({
      productName: ci.product.name,
      categoryName: (ci.product.category as Category).name,
      quantity: ci.quantity,
    }));
    const cartProductIds = new Set(
      cart?.items.getItems().map((ci) => ci.product._id.toString()) ?? [],
    );

    // Fetch candidate products (available, not already purchased, not in cart, not excluded)
    const excludeSet = new Set([
      ...purchasedProductIds,
      ...cartProductIds,
      ...excludeProductIds,
    ]);
    const allProducts = await this.productRepo.find(
      { deletedAt: null, stock: { $gt: 0 } },
      { populate: ['category'] },
    );

    // Pre-compute avg ratings
    const productIds = allProducts.map((p) => p._id);
    const reviews = await this.reviewRepo.find({
      product: { $in: productIds },
    });
    const ratingMap = new Map<string, { sum: number; count: number }>();
    for (const r of reviews) {
      const key = r.product._id.toString();
      const ex = ratingMap.get(key) ?? { sum: 0, count: 0 };
      ratingMap.set(key, { sum: ex.sum + r.rating, count: ex.count + 1 });
    }

    const candidates: ProductRecommendationContext[] = allProducts
      .filter((p) => !excludeSet.has(p._id.toString()))
      .map((p) => {
        const rating = ratingMap.get(p._id.toString());
        return {
          id: p._id.toString(),
          name: p.name,
          category: (p.category as Category).name,
          categoryHealthTags: (p.category as Category).healthTags,
          description: p.description,
          ingredients: p.ingredients,
          healthBenefits: p.healthBenefits,
          dietaryTags: p.dietaryTags,
          allergens: p.allergens,
          nutrition: p.nutrition,
          price: p.price,
          avgRating: rating ? rating.sum / rating.count : undefined,
        };
      })
      .slice(0, 80); // cap context size sent to AI

    return {
      user: {
        healthProfile: user.healthProfile ?? {},
        purchaseHistory,
        cartItems,
      },
      candidates,
      limit,
      query,
    };
  }

  private toApiResponse(
    output: RecommendationOutput,
    userId: string,
    cached: boolean,
  ): RecommendationApiResponse {
    return {
      ...output,
      provider: this.provider.name,
      cached,
      generatedAt: new Date(),
    };
  }
}
```

---

## Part 5: API Endpoints (BE interface)

### User health profile

```
GET  /users/me/health-profile       → UserHealthProfile (or null)
PUT  /users/me/health-profile       → save/replace full profile
```

`UpdateHealthProfileDto` mirrors `UserHealthProfile` with all optional fields and class-validator decorators (`@IsEnum`, `@IsArray`, `@IsNumber`, etc.).

### Recommendations

```
POST /recommendations               → get personalized recommendations
POST /recommendations?refresh=true  → bypass cache, force new generation
```

**Request body:**

```typescript
class GetRecommendationsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string; // "I need something high in iron for post-workout"

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeProductIds?: string[]; // already shown, in cart, etc.
}
```

**Response:**

```typescript
interface RecommendationApiResponse {
  provider: string; // 'claude' | 'openai' | 'mock'
  cached: boolean;
  generatedAt: Date;
  items: {
    product: Product; // fully populated, not just ID
    rank: number;
    score: number;
    reason: string;
  }[];
  summary: string;
  nutritionInsight?: string;
  warnings?: string[];
}
```

The service receives raw `productId` strings from the AI, then fetches and populates full `Product` objects before returning to the FE.

---

## Part 6: Frontend Interface

### User preferences page (`/account/preferences`)

**Component: `HealthProfileForm`**

```
Section 1 — Dietary Identity
  [ ] Omnivore  [ ] Vegetarian  [ ] Vegan  [ ] Pescatarian  [ ] Keto  [ ] Paleo
  (radio group, single select)

Section 2 — Lifestyle & Life Stage
  [ ] Gym / Athlete    [ ] Pregnant      [ ] Diabetic
  [ ] Hypertensive     [ ] Elderly       [ ] Student
  (checkbox chips, multi-select)

Section 3 — Health Goals  (pick up to 3)
  [ ] Lose Weight      [ ] Gain Muscle   [ ] Gut Health
  [ ] Boost Immunity   [ ] More Energy   [ ] Skin Health   [ ] Heart Health
  (checkbox chips, multi-select, max 3)

Section 4 — Allergens
  [ ] Gluten  [ ] Dairy  [ ] Nuts  [ ] Shellfish  [ ] Eggs  [ ] Soy  [ ] Fish

Section 5 — Calorie Target
  Daily target: [____] kcal/day  (optional number input)

Section 6 — Preferred Categories
  [Category multi-select dropdown — loaded from GET /categories]

Section 7 — Excluded Ingredients
  [Tag input — type ingredient name, press Enter to add]
  e.g. "MSG", "artificial sweeteners", "palm oil"

Section 8 — Tell us more (optional)
  [Textarea — up to 200 chars]
  Placeholder: "e.g. I'm training for a marathon, I have IBS, I'm breastfeeding..."

[Save Preferences]
```

**API calls from this page:**

- `GET /users/me/health-profile` on mount to pre-fill
- `PUT /users/me/health-profile` on save

---

### Recommendation widget (`/` homepage or `/for-you` page)

**Component: `RecommendationSection`**

```
┌─────────────────────────────────────────────────────┐
│  Just for You                          [Refresh ↻]  │
│  ──────────────────────────────────────────────────  │
│  [Search input] "Tell us what you're looking for..." │
│                              [Ask AI →]             │
├─────────────────────────────────────────────────────┤
│  Summary card (shows response.summary)              │
│  Nutrition insight (shows response.nutritionInsight)│
│  Warnings (shown in amber if response.warnings)     │
├─────────────────────────────────────────────────────┤
│  [ProductCard]  [ProductCard]  [ProductCard]  ...   │
│  ┌───────────┐                                      │
│  │  image    │                                      │
│  │  name     │  ← standard product card            │
│  │  price    │                                      │
│  │  ★★★★☆   │                                      │
│  └───────────┘                                      │
│  "High in protein — great for muscle gain" ← reason │
└─────────────────────────────────────────────────────┘
```

**API call:**

```typescript
// On mount — default recommendations
const response = await api.post('/recommendations', { limit: 10 });

// On "Ask AI" button with query
const response = await api.post('/recommendations', {
  limit: 10,
  query: searchInput,
  excludeProductIds: alreadyShownIds,
});

// On "Refresh" button
const response = await api.post('/recommendations?refresh=true', { limit: 10 });
```

**Loading state:** show skeleton cards — recommendations can take 3–5s from a live AI call.

**Guest users (no JWT):** show the trending/top-rated list instead (Phase 1 aggregation). Don't call `/recommendations` — that requires auth.

**No health profile yet:** show a gentle nudge banner above the recommendations: "Set your health preferences for personalized recommendations →"

---

## Part 7: New Env Vars

```env
# Which provider to use: 'claude' | 'openai' | 'mock'
AI_RECOMMENDATION_PROVIDER=mock

# Required if provider=claude
ANTHROPIC_API_KEY=sk-ant-...

# Required if provider=openai (also used for embeddings in Phase 2)
OPENAI_API_KEY=sk-...
```

---

## Part 8: Build Order

| #   | Task                                                                                                     | Notes                               |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Add `UserHealthProfile` embeddable to User entity + DTO + endpoints                                      | Pure schema work                    |
| 2   | Add `NutritionFacts` embeddable + `dietaryTags`, `allergens`, `healthBenefits`, `ingredients` to Product | Pure schema work                    |
| 3   | Add `healthTags`, `targetAudience` to Category                                                           | Pure schema work                    |
| 4   | Implement `RecommendationProvider` interface + `MockProvider`                                            | Zero API keys needed                |
| 5   | Implement `RecommendationService` (build input, call provider, cache result)                             | Wire up with mock first             |
| 6   | Implement `RecommendationController` + DTOs                                                              | Test with Swagger                   |
| 7   | FE: `HealthProfileForm` page                                                                             | Calls PUT /users/me/health-profile  |
| 8   | FE: `RecommendationSection` widget                                                                       | Calls POST /recommendations         |
| 9   | Swap `MockProvider` → `ClaudeProvider` via env var                                                       | `AI_RECOMMENDATION_PROVIDER=claude` |
| 10  | Iterate on the prompt based on result quality                                                            | No code changes needed              |
