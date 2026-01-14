// server/crawlers/storeCrawlers.js
require("dotenv").config();
const mongoose = require("mongoose");

const Product = require("../models/product.model"); // keep your current name/path
const PriceHistory = require("../models/pricehistory.model");

const { runPltCrawl } = require("../scrappers/plt.scraper");

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI);
};

const upsertProducts = async (products = []) => {
  if (!products.length) return { inserted: 0, updated: 0, total: 0 };

  const ops = products.map((p) => ({
    updateOne: {
      filter: { canonicalKey: p.canonicalKey },
      update: {
        $set: { ...p, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  const res = await Product.bulkWrite(ops, { ordered: false });

  return {
    inserted: res.upsertedCount || 0,
    updated: res.modifiedCount || 0,
    total: products.length,
  };
};

const markMissingInactive = async ({ store, seenKeys }) => {
  if (!store) return { markedInactive: 0 };
  if (!Array.isArray(seenKeys) || !seenKeys.length)
    return { markedInactive: 0 };

  const res = await Product.updateMany(
    { store, status: "active", canonicalKey: { $nin: seenKeys } },
    { $set: { status: "inactive", inStock: false, updatedAt: new Date() } }
  );

  return { markedInactive: res.modifiedCount || 0 };
};

const writePriceHistoryAndDetectDrops = async ({
  products = [],
  runId,
  seenAt,
}) => {
  if (!products.length) return { historyInserted: 0, drops: 0 };

  // grab previous product prices in ONE query (fast + good enough for alerts)
  const keys = products.map((p) => p.canonicalKey).filter(Boolean);

  const prev = await Product.find(
    { canonicalKey: { $in: keys } },
    { canonicalKey: 1, price: 1 }
  ).lean();

  const prevMap = new Map(prev.map((p) => [p.canonicalKey, p.price]));

  const drops = [];
  const historyDocs = [];

  for (const p of products) {
    const prevPrice = prevMap.get(p.canonicalKey);

    if (
      typeof prevPrice === "number" &&
      typeof p.price === "number" &&
      p.price < prevPrice
    ) {
      drops.push({
        canonicalKey: p.canonicalKey,
        store: p.store,
        title: p.title,
        from: prevPrice,
        to: p.price,
        productUrl: p.productUrl,
        seenAt,
        runId,
      });
    }

    historyDocs.push({
      canonicalKey: p.canonicalKey,
      store: p.store,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      discountPercent: p.discountPercent ?? null,
      currency: p.currency || "GBP",
      seenAt,
      runId,
    });
  }

  // insert price history (deduped by {canonicalKey, runId})
  let historyInserted = 0;
  if (historyDocs.length) {
    try {
      const inserted = await PriceHistory.insertMany(historyDocs, {
        ordered: false,
      });
      historyInserted = inserted.length;
    } catch (err) {
      // swallow duplicate key errors from re-running same runId
      // but still count what got inserted if mongoose provides it
      if (err?.insertedDocs?.length) historyInserted = err.insertedDocs.length;
    }
  }

  // for now: just log drops; next step is saving alerts + sending emails
  if (drops.length) {
    console.log(
      `PRICE DROPS ✅ (${drops.length})`,
      drops.slice(0, 5).map((d) => ({
        title: d.title,
        from: d.from,
        to: d.to,
      }))
    );
  }

  return { historyInserted, drops: drops.length };
};

const run = async () => {
  await connectDB();

  const runId = `plt:${Date.now()}`; // unique per run
  const seenAt = new Date();

  const result = await runPltCrawl();

  // 1) price history + drop detection (uses previous Product.price)
  const historySummary = await writePriceHistoryAndDetectDrops({
    products: result,
    runId,
    seenAt,
  });

  // 2) upsert products (reactivation is automatic because scraper sets active/inStock)
  const upsertSummary = await upsertProducts(result);

  // 3) mark missing inactive
  const store = result?.[0]?.store || "prettylittlething";
  const seenKeys = result.map((p) => p.canonicalKey).filter(Boolean);
  const inactiveSummary = await markMissingInactive({ store, seenKeys });

  console.log("PLT ✅", {
    ...upsertSummary,
    ...inactiveSummary,
    ...historySummary,
    runId,
  });

  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error("Crawler failed ❌", err);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
