import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { config } from 'dotenv';
import { Category } from '../entities/category/category.entity';
import { Product } from '../entities/product/product.entity';
import { User, UserRole } from '../entities/user/user.entity';
import { hashPassword } from '../common/utils/password.util';

config();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  {
    name: 'Vegetables',
    slug: 'vegetables',
    description: 'Fresh, clean vegetables sourced daily from local farms',
    imageUrl: 'https://placehold.co/400x300?text=Vegetables',
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Fresh fruits — domestic and imported varieties',
    imageUrl: 'https://placehold.co/400x300?text=Fruits',
  },
  {
    name: 'Grains & Nuts',
    slug: 'grains-nuts',
    description: 'Whole grains and nutrient-rich nuts',
    imageUrl: 'https://placehold.co/400x300?text=Grains+%26+Nuts',
  },
  {
    name: 'Dairy & Eggs',
    slug: 'dairy-eggs',
    description: 'Fresh milk, organic eggs, and dairy products',
    imageUrl: 'https://placehold.co/400x300?text=Dairy+%26+Eggs',
  },
  {
    name: 'Supplements',
    slug: 'supplements',
    description: 'Health supplements, vitamins, and minerals',
    imageUrl: 'https://placehold.co/400x300?text=Supplements',
  },
];

// Price unit: stored as VND / 1000  (e.g., 45_000 VND → 45)
const PRODUCTS: {
  name: string;
  slug: string;
  description: string;
  price: number; // in "VND / 1000" units
  stock: number;
  imageUrl: string;
  categorySlug: string;
}[] = [
  // ── Vegetables ───────────────────────────────────────────────────────────
  {
    name: 'Organic Broccoli',
    slug: 'organic-broccoli',
    description: 'Organic broccoli, rich in fiber and vitamin C, 500g/bag',
    price: 35,
    stock: 100,
    imageUrl: 'https://placehold.co/400x300?text=Organic+Broccoli',
    categorySlug: 'vegetables',
  },
  {
    name: 'Baby Carrots',
    slug: 'baby-carrots',
    description: 'Sweet and crunchy baby carrots, ready to eat, 300g/pack',
    price: 28,
    stock: 120,
    imageUrl: 'https://placehold.co/400x300?text=Baby+Carrots',
    categorySlug: 'vegetables',
  },
  {
    name: 'Fresh Spinach',
    slug: 'fresh-spinach',
    description: 'Clean fresh spinach, high in iron, 200g/bag',
    price: 25,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Fresh+Spinach',
    categorySlug: 'vegetables',
  },
  {
    name: 'Baby Bok Choy',
    slug: 'baby-bok-choy',
    description: 'Tender baby bok choy, great for stir-fry or soup, 300g/pack',
    price: 22,
    stock: 90,
    imageUrl: 'https://placehold.co/400x300?text=Baby+Bok+Choy',
    categorySlug: 'vegetables',
  },
  {
    name: 'Japanese Purple Sweet Potato',
    slug: 'japanese-purple-sweet-potato',
    description:
      'Whole Japanese purple sweet potato, rich in anthocyanin, 1kg/bag',
    price: 45,
    stock: 70,
    imageUrl: 'https://placehold.co/400x300?text=Purple+Sweet+Potato',
    categorySlug: 'vegetables',
  },

  // ── Fruits ────────────────────────────────────────────────────────────────
  {
    name: 'Envy Apple (New Zealand)',
    slug: 'envy-apple-new-zealand',
    description:
      'Imported Envy apples from New Zealand, crisp and sweet, 4 pcs/box',
    price: 95,
    stock: 50,
    imageUrl: 'https://placehold.co/400x300?text=Envy+Apple',
    categorySlug: 'fruits',
  },
  {
    name: 'Organic Banana',
    slug: 'organic-banana',
    description: 'Organic bananas from Da Lat, naturally ripened, ~1kg/bunch',
    price: 38,
    stock: 80,
    imageUrl: 'https://placehold.co/400x300?text=Organic+Banana',
    categorySlug: 'fruits',
  },
  {
    name: 'Fresh Blueberries',
    slug: 'fresh-blueberries',
    description:
      'Imported fresh blueberries, rich in antioxidants, 125g/punnet',
    price: 85,
    stock: 60,
    imageUrl: 'https://placehold.co/400x300?text=Blueberries',
    categorySlug: 'fruits',
  },
  {
    name: 'Da Lat Strawberries',
    slug: 'da-lat-strawberries',
    description: 'Fresh Da Lat strawberries, morning-harvested, 250g/box',
    price: 55,
    stock: 75,
    imageUrl: 'https://placehold.co/400x300?text=Strawberries',
    categorySlug: 'fruits',
  },
  {
    name: 'Hass Avocado',
    slug: 'hass-avocado',
    description: 'Creamy Hass avocado with golden flesh, 2 pcs/bag',
    price: 48,
    stock: 65,
    imageUrl: 'https://placehold.co/400x300?text=Hass+Avocado',
    categorySlug: 'fruits',
  },

  // ── Grains & Nuts ─────────────────────────────────────────────────────────
  {
    name: 'Australian Rolled Oats',
    slug: 'australian-rolled-oats',
    description: 'Imported rolled oats from Australia, unsweetened, 500g/box',
    price: 65,
    stock: 150,
    imageUrl: 'https://placehold.co/400x300?text=Rolled+Oats',
    categorySlug: 'grains-nuts',
  },
  {
    name: 'Organic Chia Seeds',
    slug: 'organic-chia-seeds',
    description: 'Organic chia seeds, rich in omega-3, 500g/bag',
    price: 120,
    stock: 100,
    imageUrl: 'https://placehold.co/400x300?text=Chia+Seeds',
    categorySlug: 'grains-nuts',
  },
  {
    name: 'Roasted Almonds',
    slug: 'roasted-almonds',
    description: 'Dry-roasted unsalted almonds, no butter added, 200g/bag',
    price: 95,
    stock: 120,
    imageUrl: 'https://placehold.co/400x300?text=Roasted+Almonds',
    categorySlug: 'grains-nuts',
  },
  {
    name: 'Walnuts',
    slug: 'walnuts',
    description: 'Premium US walnuts, in-shell or halved, 200g/bag',
    price: 110,
    stock: 90,
    imageUrl: 'https://placehold.co/400x300?text=Walnuts',
    categorySlug: 'grains-nuts',
  },
  {
    name: 'Organic Red Brown Rice',
    slug: 'organic-red-brown-rice',
    description:
      'Organic red brown rice from Binh Thuan, soft and nutty, 1kg/bag',
    price: 55,
    stock: 200,
    imageUrl: 'https://placehold.co/400x300?text=Red+Brown+Rice',
    categorySlug: 'grains-nuts',
  },

  // ── Dairy & Eggs ──────────────────────────────────────────────────────────
  {
    name: 'Unsweetened Almond Milk',
    slug: 'unsweetened-almond-milk',
    description: 'Unsweetened almond milk, lactose-free, 1L/carton',
    price: 75,
    stock: 1000,
    imageUrl: 'https://placehold.co/400x300?text=Almond+Milk',
    categorySlug: 'dairy-eggs',
  },
  {
    name: 'Organic Free-Range Eggs',
    slug: 'organic-free-range-eggs',
    description: 'Organic free-range chicken eggs, box of 10',
    price: 650,
    stock: 1000,
    imageUrl: 'https://placehold.co/400x300?text=Free+Range+Eggs',
    categorySlug: 'dairy-eggs',
  },
  {
    name: 'Plain Greek Yogurt',
    slug: 'plain-greek-yogurt',
    description: 'Unsweetened Greek yogurt, high in protein, 500g/tub',
    price: 800,
    stock: 1000,
    imageUrl: 'https://placehold.co/400x300?text=Greek+Yogurt',
    categorySlug: 'dairy-eggs',
  },

  // ── Supplements ───────────────────────────────────────────────────────────
  {
    name: 'Whey Protein Powder',
    slug: 'whey-protein-powder',
    description:
      'Whey protein isolate, 25g protein/scoop, vanilla flavor, 1kg/tub',
    price: 650,
    stock: 1000,
    imageUrl: 'https://placehold.co/400x300?text=Whey+Protein',
    categorySlug: 'supplements',
  },
  {
    name: 'Collagen Peptides',
    slug: 'collagen-peptides',
    description:
      'Hydrolyzed collagen peptides, unflavored, easy to dissolve, 300g/tub',
    price: 480,
    stock: 1000,
    imageUrl: 'https://placehold.co/400x300?text=Collagen',
    categorySlug: 'supplements',
  },
  {
    name: 'Vitamin C 1000mg',
    slug: 'vitamin-c-1000mg',
    description: 'Chewable Vitamin C 1000mg, orange flavor, 60 tablets/box',
    price: 185,
    stock: 1000,
    imageUrl: 'https://placehold.co/400x300?text=Vitamin+C',
    categorySlug: 'supplements',
  },
  {
    name: 'Omega-3 Fish Oil',
    slug: 'omega-3-fish-oil',
    description: 'Omega-3 fish oil 1000mg, 90 softgels/bottle',
    price: 320,
    stock: 1000,
    imageUrl: 'https://placehold.co/400x300?text=Omega+3',
    categorySlug: 'supplements',
  },
];

// Admin account
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
    entities: [Category, Product, User],
    allowGlobalContext: true,
  });

  const em = orm.em.fork();

  console.log('🌱 Starting seed...\n');

  // ── Admin user ─────────────────────────────────────────────────────────────
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
      console.log(`⏭  Category already exists: ${cat.name}`);
    }
    categoryMap.set(cat.slug, category);
  }

  // Flush so categories have _id before products reference them
  await em.flush();

  // ── Products ───────────────────────────────────────────────────────────────
  for (const p of PRODUCTS) {
    const existing = await em.findOne(Product, { slug: p.slug });
    if (existing) {
      console.log(`⏭  Product already exists: ${p.name}`);
      continue;
    }

    const category = categoryMap.get(p.categorySlug);
    if (!category) {
      console.warn(
        `⚠️  Category not found for slug "${p.categorySlug}", skipping ${p.name}`,
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
    em.persist(product);
    console.log(`✅ Product: ${p.name} — ${p.price.toLocaleString('vi-VN')}đ`);
  }

  await em.flush();

  console.log('\n🎉 Seed completed successfully!');
  console.log(
    `\nAdmin login:\n  Email:    ${ADMIN.email}\n  Password: ${ADMIN.password}\n`,
  );

  await orm.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
