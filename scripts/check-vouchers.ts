import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const url = process.env.DATABASE_URL!;
  const dbName = process.env.DATABASE_NAME!;
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(dbName);

  const docs = await db.collection('voucher').find({}).toArray();
  console.log(`Total vouchers: ${docs.length}`);
  for (const d of docs) {
    const summary = {
      code: d.code,
      name: d.name,
      type: d.type,
      value: d.value,
      minOrderAmount: d.minOrderAmount,
      maxDiscount: d.maxDiscount,
      usageLimit: d.usageLimit,
      perUserLimit: d.perUserLimit,
      validFrom: d.validFrom,
      validTo: d.validTo,
      isClaimable: d.isClaimable,
      isActive: d.isActive,
      firstOrderOnly: d.firstOrderOnly,
    };
    console.log(JSON.stringify(summary));
  }
  await client.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
