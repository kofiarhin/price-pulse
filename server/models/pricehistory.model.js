// server/models/pricehistory.model.js
const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, index: true },

    canonicalKey: { type: String, required: true, index: true },
    store: { type: String, required: true, index: true },
    storeName: { type: String, required: true },

    title: { type: String, required: true },
    currency: { type: String, required: true },

    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null },
    discountPercent: { type: Number, default: null },

    productUrl: { type: String, required: true },
    saleUrl: { type: String, required: true },

    status: { type: String, default: "active", index: true },
    inStock: { type: Boolean, default: true, index: true },

    category: { type: String, default: null, index: true },
    gender: { type: String, default: "women", index: true },

    colors: { type: [String], default: [] },
    sizes: { type: [String], default: [] },

    seenAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// ✅ prevents duplicates within the same run
priceHistorySchema.index({ canonicalKey: 1, runId: 1 }, { unique: true });

module.exports = mongoose.model("PriceHistory", priceHistorySchema);
