/* eslint-disable max-lines-per-function */
import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { config } from 'dotenv';
import { Category } from '../entities/category/category.entity';
import { Product } from '../entities/product/product.entity';
import { User, UserRole } from '../entities/user/user.entity';
import { Voucher, VoucherType } from '../entities/voucher/voucher.entity';
import { VoucherUsage } from '../entities/voucher/voucher-usage.entity';
import { hashPassword } from '../common/utils/password.util';

config();

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    name: 'Fresh Salads & Bowls',
    slug: 'fresh-salads-bowls',
    description:
      'Ready-to-eat salads and nourishing grain bowls, prepared fresh daily',
    imageUrl: 'https://placehold.co/400x300?text=Salads+%26+Bowls',
  },
  {
    name: 'Healthy Drinks & Juices',
    slug: 'healthy-drinks-juices',
    description:
      'Cold-pressed juices, smoothies, kombucha, and functional beverages',
    imageUrl: 'https://placehold.co/400x300?text=Drinks+%26+Juices',
  },
  {
    name: 'Healthy Snacks',
    slug: 'healthy-snacks',
    description:
      'Guilt-free snacks — high-protein, low-sugar, whole-food based',
    imageUrl: 'https://placehold.co/400x300?text=Healthy+Snacks',
  },
  {
    name: 'Meal Kits & Combos',
    slug: 'meal-kits-combos',
    description:
      'Complete meal solutions and multi-day food plans curated by nutritionists',
    imageUrl: 'https://placehold.co/400x300?text=Meal+Kits',
  },
  {
    name: 'Organic Grains, Seeds & Pantry',
    slug: 'organic-grains-seeds-pantry',
    description:
      'Organic whole grains, superseeds, and clean-label pantry staples',
    imageUrl: 'https://placehold.co/400x300?text=Grains+%26+Seeds',
  },
  {
    name: 'Fresh Produce Bundles',
    slug: 'fresh-produce-bundles',
    description: 'Curated boxes of organic fruits, vegetables, and microgreens',
    imageUrl: 'https://placehold.co/400x300?text=Produce+Bundles',
  },
];

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

interface ProductSeed {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categorySlug: string;
  keyCharacteristics?: string[];
  weight?: number;
  weightUnit?: string;
  calories?: number;
  healthScore?: number;
  shelfLife?: string;
}

const PRODUCTS: ProductSeed[] = [
  // ── Fresh Salads & Bowls ──────────────────────────────────────────────────
  {
    name: 'Classic Caesar Salad',
    slug: 'classic-caesar-salad',
    description:
      'Crisp romaine lettuce, parmesan shavings, whole-grain croutons, and light Caesar dressing',
    price: 850,
    stock: 50,
    imageUrl: 'https://placehold.co/400x300?text=Caesar+Salad',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: ['High fiber', 'Low carb', 'Rich in vitamin K'],
    weight: 300,
    weightUnit: 'g',
    calories: 220,
    healthScore: 8.5,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Vietnamese Herb & Chicken Salad',
    slug: 'vietnamese-herb-chicken-salad',
    description:
      'Shredded poached chicken, cabbage, fresh herbs, chili-lime dressing — a local healthy classic',
    price: 900,
    stock: 50,
    imageUrl: 'https://placehold.co/400x300?text=Goi+Ga',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: ['High protein', 'Gluten-free', 'No added sugar'],
    weight: 320,
    weightUnit: 'g',
    calories: 240,
    healthScore: 9.0,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Quinoa Power Bowl',
    slug: 'quinoa-power-bowl',
    description:
      'Quinoa base with roasted sweet potato, chickpeas, spinach, and tahini dressing',
    price: 1100,
    stock: 40,
    imageUrl: 'https://placehold.co/400x300?text=Quinoa+Bowl',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: ['Plant-based protein', 'High fiber', 'Iron-rich'],
    weight: 350,
    weightUnit: 'g',
    calories: 310,
    healthScore: 9.2,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Tuna Nicoise Salad',
    slug: 'tuna-nicoise-salad',
    description:
      'Albacore tuna, boiled egg, green beans, cherry tomatoes, olives, light vinaigrette',
    price: 1050,
    stock: 40,
    imageUrl: 'https://placehold.co/400x300?text=Tuna+Nicoise',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: ['High protein', 'Omega-3 rich', 'Low GI'],
    weight: 330,
    weightUnit: 'g',
    calories: 280,
    healthScore: 8.8,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Asian Soba Noodle Salad',
    slug: 'asian-soba-noodle-salad',
    description:
      'Buckwheat soba, edamame, shredded carrot, cucumber, sesame-ginger dressing',
    price: 950,
    stock: 45,
    imageUrl: 'https://placehold.co/400x300?text=Soba+Salad',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: ['Whole grain', 'Vegan', 'Low sodium'],
    weight: 300,
    weightUnit: 'g',
    calories: 260,
    healthScore: 8.6,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Greek Salad with Tofu Feta',
    slug: 'greek-salad-tofu-feta',
    description:
      'Cherry tomatoes, cucumber, Kalamata olives, red onion, marinated tofu feta, oregano',
    price: 920,
    stock: 45,
    imageUrl: 'https://placehold.co/400x300?text=Greek+Salad',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: ['Vegan', 'Calcium-rich', 'Low calorie'],
    weight: 280,
    weightUnit: 'g',
    calories: 200,
    healthScore: 8.7,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Salmon Poke Bowl',
    slug: 'salmon-poke-bowl',
    description:
      'Brown rice base, fresh salmon cubes, avocado, seaweed salad, pickled ginger, ponzu sauce',
    price: 1450,
    stock: 30,
    imageUrl: 'https://placehold.co/400x300?text=Poke+Bowl',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: ['Omega-3 rich', 'High protein', 'Antioxidant-packed'],
    weight: 380,
    weightUnit: 'g',
    calories: 420,
    healthScore: 9.4,
    shelfLife: 'Same day only',
  },
  {
    name: 'Detox Green Bowl',
    slug: 'detox-green-bowl',
    description:
      'Kale, broccoli, cucumber, avocado, hemp seeds, lemon-tahini dressing',
    price: 980,
    stock: 45,
    imageUrl: 'https://placehold.co/400x300?text=Detox+Bowl',
    categorySlug: 'fresh-salads-bowls',
    keyCharacteristics: [
      'Detoxifying',
      'Anti-inflammatory',
      'Rich in chlorophyll',
    ],
    weight: 300,
    weightUnit: 'g',
    calories: 230,
    healthScore: 9.5,
    shelfLife: '1 day (refrigerated)',
  },

  // ── Healthy Drinks & Juices ───────────────────────────────────────────────
  {
    name: 'Cold-Pressed Green Detox Juice',
    slug: 'cold-pressed-green-detox-juice',
    description:
      'Spinach, cucumber, green apple, ginger, lemon — cold-pressed to retain nutrients',
    price: 650,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Green+Juice',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: ['No added sugar', 'Raw vitamins', 'Alkalizing'],
    weight: 330,
    weightUnit: 'ml',
    calories: 90,
    healthScore: 9.6,
    shelfLife: '3 days (refrigerated)',
  },
  {
    name: 'Turmeric Golden Latte',
    slug: 'turmeric-golden-latte',
    description: 'Oat milk, turmeric, black pepper, cinnamon, a touch of honey',
    price: 580,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Golden+Latte',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: ['Anti-inflammatory', 'Caffeine-free', 'Gut-friendly'],
    weight: 250,
    weightUnit: 'ml',
    calories: 110,
    healthScore: 9.0,
    shelfLife: '2 days (refrigerated)',
  },
  {
    name: 'Watermelon Mint Cooler',
    slug: 'watermelon-mint-cooler',
    description:
      'Fresh watermelon juice, fresh mint, chia seeds, no added sugar',
    price: 520,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Watermelon+Cooler',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: ['Hydrating', 'Electrolyte-rich', 'Low calorie'],
    weight: 350,
    weightUnit: 'ml',
    calories: 70,
    healthScore: 8.8,
    shelfLife: '2 days (refrigerated)',
  },
  {
    name: 'Kombucha — Ginger & Lemon',
    slug: 'kombucha-ginger-lemon',
    description:
      'Raw fermented tea with live cultures, ginger, and lemon flavor',
    price: 720,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Kombucha',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: ['Probiotic', 'Gut health support', 'Low sugar'],
    weight: 330,
    weightUnit: 'ml',
    calories: 40,
    healthScore: 9.1,
    shelfLife: '14 days (refrigerated)',
  },
  {
    name: 'Beetroot & Berry Smoothie',
    slug: 'beetroot-berry-smoothie',
    description: 'Beetroot, blueberry, banana, almond milk, flaxseed',
    price: 680,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Beetroot+Smoothie',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: ['Antioxidant-rich', 'Heart-healthy', 'Iron-boosting'],
    weight: 300,
    weightUnit: 'ml',
    calories: 160,
    healthScore: 9.0,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Unsweetened Matcha Latte',
    slug: 'unsweetened-matcha-latte',
    description: 'Ceremonial grade matcha, oat milk, no added sugar',
    price: 620,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Matcha+Latte',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: [
      'L-theanine for focus',
      'Antioxidant-rich',
      'Low caffeine',
    ],
    weight: 250,
    weightUnit: 'ml',
    calories: 80,
    healthScore: 9.2,
    shelfLife: '2 days (refrigerated)',
  },
  {
    name: 'Coconut Water',
    slug: 'coconut-water',
    description:
      '100% natural young coconut water, no preservatives, no added sugar',
    price: 450,
    stock: 100,
    imageUrl: 'https://placehold.co/400x300?text=Coconut+Water',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: ['Hydrating', 'Electrolyte-packed', 'Low calorie'],
    weight: 330,
    weightUnit: 'ml',
    calories: 60,
    healthScore: 9.3,
    shelfLife: '5 days (refrigerated)',
  },
  {
    name: 'Pineapple Ginger Immunity Shot',
    slug: 'pineapple-ginger-immunity-shot',
    description:
      'Cold-pressed pineapple, ginger, turmeric, black pepper — concentrated immune booster',
    price: 380,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Immunity+Shot',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: [
      'High vitamin C',
      'Anti-inflammatory',
      'Digestive support',
    ],
    weight: 60,
    weightUnit: 'ml',
    calories: 30,
    healthScore: 9.5,
    shelfLife: '5 days (refrigerated)',
  },
  {
    name: 'Aloe Vera & Cucumber Water',
    slug: 'aloe-vera-cucumber-water',
    description: 'Organic aloe vera juice blended with fresh cucumber and mint',
    price: 480,
    stock: 70,
    imageUrl: 'https://placehold.co/400x300?text=Aloe+Water',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: ['Skin-hydrating', 'Gut-soothing', 'Zero added sugar'],
    weight: 300,
    weightUnit: 'ml',
    calories: 25,
    healthScore: 9.0,
    shelfLife: '3 days (refrigerated)',
  },
  {
    name: 'High-Protein Chocolate Shake',
    slug: 'high-protein-chocolate-shake',
    description:
      'Plant-based protein powder, cacao, banana, oat milk, chia seeds',
    price: 850,
    stock: 50,
    imageUrl: 'https://placehold.co/400x300?text=Protein+Shake',
    categorySlug: 'healthy-drinks-juices',
    keyCharacteristics: [
      '25g protein per serving',
      'Muscle recovery',
      'Dairy-free',
    ],
    weight: 350,
    weightUnit: 'ml',
    calories: 280,
    healthScore: 8.9,
    shelfLife: '1 day (refrigerated)',
  },

  // ── Healthy Snacks ────────────────────────────────────────────────────────
  {
    name: 'Roasted Chickpeas — Sea Salt',
    slug: 'roasted-chickpeas-sea-salt',
    description:
      'Oven-roasted chickpeas lightly seasoned with sea salt and olive oil',
    price: 420,
    stock: 100,
    imageUrl: 'https://placehold.co/400x300?text=Roasted+Chickpeas',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: ['High protein', 'High fiber', 'Gluten-free', 'Vegan'],
    weight: 100,
    weightUnit: 'g',
    calories: 130,
    healthScore: 9.0,
    shelfLife: '30 days',
  },
  {
    name: 'Dark Chocolate & Almond Bar',
    slug: 'dark-chocolate-almond-bar',
    description: '70% dark chocolate with whole roasted almonds, low sugar',
    price: 480,
    stock: 100,
    imageUrl: 'https://placehold.co/400x300?text=Choc+Almond+Bar',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: ['Antioxidant-rich', 'Heart-healthy fats', 'Low GI'],
    weight: 40,
    weightUnit: 'g',
    calories: 190,
    healthScore: 8.4,
    shelfLife: '60 days',
  },
  {
    name: 'Mixed Nuts & Dried Berry Pack',
    slug: 'mixed-nuts-dried-berry-pack',
    description:
      'Cashews, almonds, walnuts, dried cranberry, no salt, no sugar added',
    price: 650,
    stock: 90,
    imageUrl: 'https://placehold.co/400x300?text=Mixed+Nuts',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: [
      'Omega-3 rich',
      'High in healthy fats',
      'Energy-boosting',
    ],
    weight: 80,
    weightUnit: 'g',
    calories: 420,
    healthScore: 8.8,
    shelfLife: '45 days',
  },
  {
    name: 'Seaweed Crisps — Original',
    slug: 'seaweed-crisps-original',
    description: 'Thin-baked seaweed sheets with sesame oil, light and crispy',
    price: 350,
    stock: 120,
    imageUrl: 'https://placehold.co/400x300?text=Seaweed+Crisps',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: ['Low calorie', 'Iodine-rich', 'Vegan'],
    weight: 30,
    weightUnit: 'g',
    calories: 60,
    healthScore: 8.6,
    shelfLife: '30 days',
  },
  {
    name: 'Banana Oat Energy Bites',
    slug: 'banana-oat-energy-bites',
    description:
      'Oat-based bites with mashed banana, honey, and dark chocolate chips, no bake',
    price: 550,
    stock: 70,
    imageUrl: 'https://placehold.co/400x300?text=Energy+Bites',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: [
      'Natural energy boost',
      'Whole grain',
      'No refined sugar',
    ],
    weight: 120,
    weightUnit: 'g',
    calories: 180,
    healthScore: 8.5,
    shelfLife: '5 days (refrigerated)',
  },
  {
    name: 'Rice Crackers with Avocado Dip',
    slug: 'rice-crackers-avocado-dip',
    description:
      'Whole-grain rice crackers served with a single-serve avocado & lime dip',
    price: 580,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Rice+Crackers',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: ['Whole grain', 'Healthy fats', 'Low sodium'],
    weight: 90,
    weightUnit: 'g',
    calories: 200,
    healthScore: 8.7,
    shelfLife: '3 days (refrigerated for dip)',
  },
  {
    name: 'Kale Chips — Nutritional Yeast',
    slug: 'kale-chips-nutritional-yeast',
    description:
      'Dehydrated kale crisps with nutritional yeast, garlic, and lemon',
    price: 520,
    stock: 90,
    imageUrl: 'https://placehold.co/400x300?text=Kale+Chips',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: ['Rich in vitamins A, C, K', 'Vegan', 'Low calorie'],
    weight: 40,
    weightUnit: 'g',
    calories: 80,
    healthScore: 9.2,
    shelfLife: '21 days',
  },
  {
    name: 'Greek Yogurt Parfait Cup',
    slug: 'greek-yogurt-parfait-cup',
    description:
      'Low-fat Greek yogurt layered with granola, fresh berries, and honey',
    price: 620,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Yogurt+Parfait',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: ['High protein', 'Probiotic', 'Calcium-rich'],
    weight: 200,
    weightUnit: 'g',
    calories: 210,
    healthScore: 8.9,
    shelfLife: '2 days (refrigerated)',
  },
  {
    name: 'Edamame — Lightly Salted',
    slug: 'edamame-lightly-salted',
    description: 'Steamed young soybeans in pod, lightly salted, ready to eat',
    price: 450,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Edamame',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: ['Complete plant protein', 'Fiber-rich', 'Low fat'],
    weight: 150,
    weightUnit: 'g',
    calories: 120,
    healthScore: 9.1,
    shelfLife: '2 days (refrigerated)',
  },
  {
    name: 'Whole Grain Granola Bar',
    slug: 'whole-grain-granola-bar',
    description:
      'Oats, sunflower seeds, honey, dried mango, bound with natural nut butter',
    price: 380,
    stock: 120,
    imageUrl: 'https://placehold.co/400x300?text=Granola+Bar',
    categorySlug: 'healthy-snacks',
    keyCharacteristics: [
      'Slow-release energy',
      'Fiber-rich',
      'No artificial additives',
    ],
    weight: 45,
    weightUnit: 'g',
    calories: 180,
    healthScore: 8.3,
    shelfLife: '45 days',
  },

  // ── Meal Kits & Combos ────────────────────────────────────────────────────
  {
    name: 'Balanced Lunch Box — Chicken & Veg',
    slug: 'balanced-lunch-box-chicken-veg',
    description:
      'Grilled chicken breast, steamed brown rice, roasted vegetables, side salad',
    price: 1250,
    stock: 40,
    imageUrl: 'https://placehold.co/400x300?text=Lunch+Box',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: ['Macro-balanced', 'High protein', 'Meal-prep ready'],
    weight: 450,
    weightUnit: 'g',
    calories: 480,
    healthScore: 9.1,
    shelfLife: '1 day (refrigerated)',
  },
  {
    name: 'Vegan Buddha Bowl Kit',
    slug: 'vegan-buddha-bowl-kit',
    description:
      'Pre-portioned ingredients kit: quinoa, roasted chickpeas, tahini, kale, sweet potato',
    price: 1380,
    stock: 35,
    imageUrl: 'https://placehold.co/400x300?text=Buddha+Bowl+Kit',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: [
      '100% plant-based',
      'Complete amino acids',
      'DIY at home',
    ],
    weight: 500,
    weightUnit: 'g',
    calories: 390,
    healthScore: 9.3,
    shelfLife: '3 days (refrigerated)',
  },
  {
    name: 'Weight-Loss Meal Set (3 meals/day)',
    slug: 'weight-loss-meal-set',
    description:
      'Curated full-day meal set: light breakfast wrap, detox salad lunch, lean protein dinner',
    price: 2850,
    stock: 20,
    imageUrl: 'https://placehold.co/400x300?text=Meal+Set',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: [
      'Calorie-controlled (~1,200 kcal/day)',
      'Nutritionist-approved',
      'Portioned',
    ],
    healthScore: 9.4,
    shelfLife: 'Same day delivery',
  },
  {
    name: 'Gym Recovery Box',
    slug: 'gym-recovery-box',
    description:
      'Post-workout combo: protein shake, boiled eggs x2, banana, mixed nuts, brown rice box',
    price: 1850,
    stock: 30,
    imageUrl: 'https://placehold.co/400x300?text=Gym+Recovery',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: [
      'High protein (~55g total)',
      'Fast-absorbing carbs',
      'Muscle recovery focus',
    ],
    healthScore: 9.0,
    shelfLife: '1 day',
  },
  {
    name: 'Healthy Breakfast Starter Kit',
    slug: 'healthy-breakfast-starter-kit',
    description:
      'Rolled oats, chia seeds, almond milk, blueberries, honey — 5-day morning kit',
    price: 2200,
    stock: 25,
    imageUrl: 'https://placehold.co/400x300?text=Breakfast+Kit',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: [
      'Low GI',
      'Heart-healthy',
      '5-day supply for easy mornings',
    ],
    healthScore: 9.0,
    shelfLife: '5 days',
  },
  {
    name: 'Family Healthy Dinner Kit (4 servings)',
    slug: 'family-healthy-dinner-kit',
    description:
      'Herb-marinated salmon fillets, sweet potato mash ingredients, steamed broccoli, dressing',
    price: 3200,
    stock: 20,
    imageUrl: 'https://placehold.co/400x300?text=Dinner+Kit',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: ['Omega-3 rich', 'Kid-friendly', 'Easy 20-min cook'],
    weight: 900,
    weightUnit: 'g',
    calories: 400,
    healthScore: 9.2,
    shelfLife: '2 days (refrigerated)',
  },
  {
    name: 'Office Worker Lunch Bundle (5 days)',
    slug: 'office-worker-lunch-bundle',
    description:
      'Five ready-to-eat healthy lunch boxes, rotated daily (salad, rice bowl, wrap, etc.)',
    price: 5500,
    stock: 15,
    imageUrl: 'https://placehold.co/400x300?text=Lunch+Bundle',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: [
      'Weekly subscription option',
      'Variety',
      'Under 500 kcal each',
    ],
    healthScore: 8.9,
    shelfLife: 'Delivered fresh daily',
  },
  {
    name: 'Detox Weekend Pack',
    slug: 'detox-weekend-pack',
    description:
      '2-day plan: cold-pressed juices, salads, light soups, herbal teas — full detox program',
    price: 4800,
    stock: 15,
    imageUrl: 'https://placehold.co/400x300?text=Detox+Pack',
    categorySlug: 'meal-kits-combos',
    keyCharacteristics: ['Low sodium', 'No sugar', 'Cleansing ingredients'],
    healthScore: 9.5,
    shelfLife: 'Delivered fresh',
  },

  // ── Organic Grains, Seeds & Pantry ───────────────────────────────────────
  {
    name: 'Organic Brown Rice (1kg)',
    slug: 'organic-brown-rice',
    description:
      'Whole-grain brown rice, unpolished, sourced from organic farms in the Mekong Delta',
    price: 650,
    stock: 150,
    imageUrl: 'https://placehold.co/400x300?text=Brown+Rice',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'High fiber',
      'Low GI',
      'Manganese-rich',
      'No pesticides',
    ],
    weight: 1000,
    weightUnit: 'g',
    healthScore: 8.8,
    shelfLife: '12 months',
  },
  {
    name: 'Chia Seeds (250g)',
    slug: 'chia-seeds',
    description: 'Premium black chia seeds, raw, organic certified',
    price: 750,
    stock: 120,
    imageUrl: 'https://placehold.co/400x300?text=Chia+Seeds',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'Omega-3 rich',
      'High fiber',
      'High calcium',
      'Versatile ingredient',
    ],
    weight: 250,
    weightUnit: 'g',
    healthScore: 9.5,
    shelfLife: '24 months',
  },
  {
    name: 'Rolled Oats — Gluten-Free (500g)',
    slug: 'rolled-oats-gluten-free',
    description: 'Certified gluten-free rolled oats, minimally processed',
    price: 720,
    stock: 130,
    imageUrl: 'https://placehold.co/400x300?text=Rolled+Oats',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'Beta-glucan rich',
      'Lowers cholesterol',
      'Slow-release energy',
    ],
    weight: 500,
    weightUnit: 'g',
    healthScore: 9.1,
    shelfLife: '12 months',
  },
  {
    name: 'Quinoa — Tri-Color (500g)',
    slug: 'quinoa-tri-color',
    description:
      'Red, white, and black quinoa mix, organic, complete plant protein',
    price: 1200,
    stock: 100,
    imageUrl: 'https://placehold.co/400x300?text=Tri+Quinoa',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'All 9 essential amino acids',
      'Gluten-free',
      'Iron-rich',
    ],
    weight: 500,
    weightUnit: 'g',
    healthScore: 9.4,
    shelfLife: '24 months',
  },
  {
    name: 'Flaxseeds — Golden (200g)',
    slug: 'flaxseeds-golden',
    description: 'Cold-milled golden flaxseeds, rich in ALA omega-3',
    price: 580,
    stock: 110,
    imageUrl: 'https://placehold.co/400x300?text=Flaxseeds',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'Lignans for hormonal health',
      'Digestive support',
      'Heart health',
    ],
    weight: 200,
    weightUnit: 'g',
    healthScore: 9.3,
    shelfLife: '6 months (refrigerated after opening)',
  },
  {
    name: 'Hemp Seeds (150g)',
    slug: 'hemp-seeds',
    description: 'Hulled hemp seeds — nutty, soft, and packed with nutrients',
    price: 950,
    stock: 90,
    imageUrl: 'https://placehold.co/400x300?text=Hemp+Seeds',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'Complete protein',
      '10g protein per 30g serving',
      'Rich in GLA',
    ],
    weight: 150,
    weightUnit: 'g',
    healthScore: 9.5,
    shelfLife: '12 months',
  },
  {
    name: 'Organic Virgin Coconut Oil (250ml)',
    slug: 'organic-virgin-coconut-oil',
    description: 'Cold-pressed, unrefined coconut oil from organic coconuts',
    price: 1150,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Coconut+Oil',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'MCT fats',
      'Antimicrobial',
      'Suitable for cooking and skin',
    ],
    weight: 250,
    weightUnit: 'ml',
    healthScore: 8.2,
    shelfLife: '24 months',
  },
  {
    name: 'Raw Honey — Wildflower (300g)',
    slug: 'raw-honey-wildflower',
    description:
      'Unfiltered, unpasteurized wildflower honey from highland beekeepers in Da Lat',
    price: 1300,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Raw+Honey',
    categorySlug: 'organic-grains-seeds-pantry',
    keyCharacteristics: [
      'Natural antioxidants',
      'Low GI alternative to sugar',
      'Probiotic enzymes',
    ],
    weight: 300,
    weightUnit: 'g',
    healthScore: 8.5,
    shelfLife: 'Indefinite (sealed)',
  },

  // ── Fresh Produce Bundles ─────────────────────────────────────────────────
  {
    name: 'Weekly Veggie Box (Mixed Organic)',
    slug: 'weekly-veggie-box',
    description:
      'Seasonal assortment of 6–8 organic vegetables: broccoli, spinach, kale, carrot, tomato, zucchini',
    price: 1950,
    stock: 30,
    imageUrl: 'https://placehold.co/400x300?text=Veggie+Box',
    categorySlug: 'fresh-produce-bundles',
    keyCharacteristics: [
      'Certified organic',
      'Locally sourced',
      'No pesticides',
    ],
    weight: 1500,
    weightUnit: 'g',
    healthScore: 9.6,
    shelfLife: '5–7 days (refrigerated)',
  },
  {
    name: 'Superfood Fruit Box',
    slug: 'superfood-fruit-box',
    description:
      'Curated box of antioxidant-rich fruits: dragon fruit, blueberry, pomelo, papaya, kiwi',
    price: 1750,
    stock: 30,
    imageUrl: 'https://placehold.co/400x300?text=Fruit+Box',
    categorySlug: 'fresh-produce-bundles',
    keyCharacteristics: [
      'Vitamin C-rich',
      'Immune-boosting',
      'Natural sugars only',
    ],
    weight: 1200,
    weightUnit: 'g',
    healthScore: 9.4,
    shelfLife: '3–5 days',
  },
  {
    name: 'Smoothie Prep Pack — Green',
    slug: 'smoothie-prep-pack-green',
    description:
      'Pre-washed, pre-cut, portioned green smoothie ingredients: spinach, banana, green apple, ginger, cucumber — 5 servings',
    price: 1450,
    stock: 35,
    imageUrl: 'https://placehold.co/400x300?text=Smoothie+Pack',
    categorySlug: 'fresh-produce-bundles',
    keyCharacteristics: [
      'Ready to blend',
      'No prep needed',
      'Freezer-friendly',
    ],
    healthScore: 9.3,
    shelfLife: '3 days fresh / 30 days frozen',
  },
  {
    name: 'Fresh Herb Bundle',
    slug: 'fresh-herb-bundle',
    description:
      'Assortment of fresh culinary herbs: basil, mint, cilantro, dill, lemongrass',
    price: 450,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Herb+Bundle',
    categorySlug: 'fresh-produce-bundles',
    keyCharacteristics: [
      'Aromatic',
      'Rich in polyphenols',
      'Culinary and medicinal uses',
    ],
    weight: 100,
    weightUnit: 'g',
    healthScore: 9.2,
    shelfLife: '4–5 days (refrigerated)',
  },
  {
    name: 'Avocado Pack (x4 fruits)',
    slug: 'avocado-pack-x4',
    description:
      'Ready-to-eat Hass avocados, perfectly ripened for immediate use',
    price: 950,
    stock: 40,
    imageUrl: 'https://placehold.co/400x300?text=Avocado+Pack',
    categorySlug: 'fresh-produce-bundles',
    keyCharacteristics: [
      'Heart-healthy monounsaturated fats',
      'Potassium-rich',
      'Fiber-rich',
    ],
    healthScore: 9.4,
    shelfLife: '2–3 days',
  },
  {
    name: 'Sprout & Microgreen Kit',
    slug: 'sprout-microgreen-kit',
    description:
      'DIY grow-at-home kit with organic broccoli, radish, and sunflower microgreen seeds + growing tray',
    price: 1650,
    stock: 25,
    imageUrl: 'https://placehold.co/400x300?text=Microgreen+Kit',
    categorySlug: 'fresh-produce-bundles',
    keyCharacteristics: [
      'Ultra-nutrient-dense',
      'Up to 40x more nutrients than mature plants',
      'Fun to grow',
    ],
    healthScore: 9.8,
    shelfLife: 'Seeds: 12 months; grown sprouts: 5 days',
  },
];

// ---------------------------------------------------------------------------
// Vouchers
// ---------------------------------------------------------------------------

interface VoucherSeed {
  code: string;
  type: VoucherType;
  value: number;
  validFrom: Date;
  validTo: Date;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit?: number;
}

const now = new Date();
const oneYearLater = new Date(
  now.getFullYear() + 1,
  now.getMonth(),
  now.getDate(),
);
const sixMonthsLater = new Date(
  now.getFullYear(),
  now.getMonth() + 6,
  now.getDate(),
);

const VOUCHERS: VoucherSeed[] = [
  {
    code: 'WELCOME10',
    type: VoucherType.PERCENT,
    value: 10,
    validFrom: now,
    validTo: oneYearLater,
    perUserLimit: 1,
  },
  {
    code: 'HEALTHY50K',
    type: VoucherType.FIXED,
    value: 500,
    validFrom: now,
    validTo: sixMonthsLater,
    minOrderAmount: 2000,
    usageLimit: 200,
  },
  {
    code: 'NEWUSER20',
    type: VoucherType.PERCENT,
    value: 20,
    validFrom: now,
    validTo: sixMonthsLater,
    minOrderAmount: 1500,
    maxDiscount: 1000,
    perUserLimit: 1,
  },
  {
    code: 'FREESHIP',
    type: VoucherType.FIXED,
    value: 70,
    validFrom: now,
    validTo: oneYearLater,
    usageLimit: 500,
  },
  {
    code: 'SUMMER15',
    type: VoucherType.PERCENT,
    value: 15,
    validFrom: now,
    validTo: sixMonthsLater,
    minOrderAmount: 1000,
    maxDiscount: 800,
    usageLimit: 300,
  },
];

// ---------------------------------------------------------------------------
// Admin account
// ---------------------------------------------------------------------------

const ADMIN = {
  email: 'admin@healthyfood.vn',
  password: 'Admin@123',
  firstName: 'Admin',
  lastName: 'Healthyfood',
};

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------

async function seed() {
  const orm = await MikroORM.init<MongoDriver>({
    driver: MongoDriver,
    clientUrl: process.env.DATABASE_URL ?? 'mongodb://localhost:27017',
    dbName: process.env.DATABASE_NAME ?? 'healthy-food-ecommerce',
    entities: [Category, Product, User, Voucher, VoucherUsage],
    allowGlobalContext: true,
  });

  const em = orm.em.fork();

  console.log('🌱 Starting seed...\n');

  // ── Admin ──────────────────────────────────────────────────────────────────
  let admin = await em.findOne(User, { email: ADMIN.email });
  if (!admin) {
    const hashed = await hashPassword(ADMIN.password);
    admin = new User(
      ADMIN.email,
      ADMIN.firstName,
      ADMIN.lastName,
      hashed,
      UserRole.ADMIN,
    );
    em.persist(admin);
    console.log(`✅ Admin created: ${ADMIN.email} / ${ADMIN.password}`);
  } else {
    console.log(`⏭  Admin already exists, skipping.`);
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoryMap = new Map<string, Category>();

  for (const cat of CATEGORIES) {
    let category = await em.findOne(Category, { slug: cat.slug });
    if (!category) {
      category = new Category(
        cat.name,
        cat.slug,
        cat.description,
        cat.imageUrl,
      );
      em.persist(category);
      console.log(`✅ Category: ${cat.name}`);
    } else {
      console.log(`⏭  Category exists: ${cat.name}`);
    }
    categoryMap.set(cat.slug, category);
  }

  await em.flush();

  // ── Products ───────────────────────────────────────────────────────────────
  for (const p of PRODUCTS) {
    const existing = await em.findOne(Product, { slug: p.slug });
    if (existing) {
      console.log(`⏭  Product exists: ${p.name}`);
      continue;
    }

    const category = categoryMap.get(p.categorySlug);
    if (!category) {
      console.warn(
        `⚠️  Category "${p.categorySlug}" not found, skipping ${p.name}`,
      );
      continue;
    }

    const product = new Product(
      p.name,
      p.slug,
      p.price,
      p.stock,
      category,
      p.description,
      p.imageUrl,
    );

    if (p.keyCharacteristics) product.keyCharacteristics = p.keyCharacteristics;
    if (p.weight !== undefined) product.weight = p.weight;
    if (p.weightUnit) product.weightUnit = p.weightUnit;
    if (p.calories !== undefined) product.calories = p.calories;
    if (p.healthScore !== undefined) product.healthScore = p.healthScore;
    if (p.shelfLife) product.shelfLife = p.shelfLife;

    em.persist(product);
    console.log(`✅ Product: ${p.name} — ${p.price.toLocaleString('vi-VN')}đ`);
  }

  await em.flush();

  // ── Vouchers ───────────────────────────────────────────────────────────────
  for (const v of VOUCHERS) {
    const existing = await em.findOne(Voucher, { code: v.code });
    if (existing) {
      console.log(`⏭  Voucher exists: ${v.code}`);
      continue;
    }

    const voucher = new Voucher(
      v.code,
      v.type,
      v.value,
      v.validFrom,
      v.validTo,
      {
        minOrderAmount: v.minOrderAmount,
        maxDiscount: v.maxDiscount,
        usageLimit: v.usageLimit,
        perUserLimit: v.perUserLimit,
      },
    );
    em.persist(voucher);

    const typeLabel =
      v.type === VoucherType.PERCENT
        ? `${v.value}%`
        : `${v.value.toLocaleString('vi-VN')}đ`;
    console.log(`✅ Voucher: ${v.code} — ${typeLabel} off`);
  }

  await em.flush();

  console.log('\n🎉 Seed completed successfully!');
  console.log(
    `\nAdmin login:\n  Email:    ${ADMIN.email}\n  Password: ${ADMIN.password}`,
  );
  console.log(
    '\nVoucher codes: WELCOME10 | HEALTHY50K | NEWUSER20 | FREESHIP | SUMMER15\n',
  );

  await orm.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
