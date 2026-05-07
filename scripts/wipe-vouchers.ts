import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const url = process.env.DATABASE_URL;
  const dbName = process.env.DATABASE_NAME;
  if (!url || !dbName) throw new Error('Missing DATABASE_URL or DATABASE_NAME');

  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(dbName);

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  console.log(
    '[wipe] collections found:',
    collections.filter((n) => n.includes('voucher')),
  );

  for (const name of ['voucher', 'voucher-claim', 'voucher-usage']) {
    if (!collections.includes(name)) {
      console.log(`[wipe] skip "${name}" — does not exist`);
      continue;
    }
    const before = await db.collection(name).countDocuments();
    const res = await db.collection(name).deleteMany({});
    console.log(
      `[wipe] "${name}": ${before} → 0  (deleted ${res.deletedCount})`,
    );
  }

  await client.close();
  console.log('[wipe] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
