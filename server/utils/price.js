// server/utils/price.js
const parsePriceToNumber = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\s+/g, " ").trim();
  const match = s.match(/(\d{1,3}(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const n = match[1].replace(",", ".");
  const num = Number(n);
  return Number.isFinite(num) ? num : null;
};

const calcDiscountPercent = ({ price, originalPrice }) => {
  if (!price || !originalPrice) return null;
  if (originalPrice <= 0 || price >= originalPrice) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

module.exports = { parsePriceToNumber, calcDiscountPercent };
