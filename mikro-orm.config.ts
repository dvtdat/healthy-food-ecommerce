import { defineConfig } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Migrator } from '@mikro-orm/migrations';
import { EntityGenerator } from '@mikro-orm/entity-generator';
import { SeedManager } from '@mikro-orm/seeder';
import { config } from 'dotenv';

config();

export default defineConfig({
  driver: MongoDriver,
  clientUrl: process.env.DATABASE_URL ?? 'mongodb://localhost:27017',
  dbName: process.env.DATABASE_NAME ?? 'healthy-food-ecommerce',
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: true,
  extensions: [Migrator, EntityGenerator, SeedManager],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
  },
});
