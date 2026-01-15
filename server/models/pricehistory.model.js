// server/models/pricehistory.model.js
const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, index: true, trim: true },

    canonicalKey: { type: String, required: true, index: true, trim: true },
    store: { type: String, required: true, index: true, trim: true },
    storeName: { type: String, required: true, trim: true },

    title: { type: String, required: true, trim: true },
    currency: { type: String, required: true, trim: true },

    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null },
    discountPercent: { type: Number, default: null },

    productUrl: { type: String, required: true, trim: true },
    saleUrl: { type: String, required: true, trim: true },

    status: { type: String, default: "active", index: true, trim: true },
    inStock: { type: Boolean, default: true, index: true },

    category: { type: String, default: null, index: true, trim: true },
    gender: { type: String, default: "women", index: true, trim: true },

    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },

    seenAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// ✅ prevents duplicates within the same run
priceHistorySchema.index({ canonicalKey: 1, runId: 1 }, { unique: true });

// ✅ common queries (fast “drops in last 24h”, store timelines, etc.)
priceHistorySchema.index({ store: 1, seenAt: -1 });
priceHistorySchema.index({ store: 1, canonicalKey: 1, seenAt: -1 });

module.exports = mongoose.model("PriceHistory", priceHistorySchema);
