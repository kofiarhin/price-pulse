// server/models/priceDropAlert.model.js
const mongoose = require("mongoose");

const priceDropAlertSchema = new mongoose.Schema(
  {
    canonicalKey: { type: String, required: true, index: true },
    store: { type: String, required: true, index: true },
    storeName: { type: String, required: true },

    title: { type: String, required: true },
    productUrl: { type: String, required: true },

    currency: { type: String, required: true },

    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true, index: true },
    dropPercent: { type: Number, default: null },

    runId: { type: String, required: true, index: true },
    detectedAt: { type: Date, required: true, index: true },

    notified: { type: Boolean, default: false, index: true },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ✅ only one alert per (product + exact newPrice)
// so you won't alert twice for the same price drop value.
priceDropAlertSchema.index({ canonicalKey: 1, newPrice: 1 }, { unique: true });

module.exports = mongoose.model("PriceDropAlert", priceDropAlertSchema);
