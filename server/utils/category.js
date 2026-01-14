const deriveCategory = ({ title = "", productUrl = "" }) => {
  const text = `${title} ${productUrl}`.toLowerCase();

  const rules = [
    ["hoodies", ["hoodie", "hoody"]],
    ["sweatshirts", ["sweatshirt"]],
    ["jumpers", ["jumper", "knit", "cardigan"]],
    ["coats-jackets", ["coat", "jacket", "blazer", "puffer", "parka"]],
    ["dresses", ["dress"]],
    ["tops", ["top", "bodysuit", "corset"]],
    ["t-shirts", ["t-shirt", "tee"]],
    ["shirts", ["shirt"]],
    ["trousers", ["trouser", "pants", "cargo", "wide-leg", "legging"]],
    ["jeans", ["jean", "denim"]],
    ["skirts", ["skirt"]],
    ["shorts", ["shorts"]],
    ["shoes", ["heels", "trainers", "sneakers", "boots", "sandals"]],
    ["bags", ["bag", "handbag", "tote"]],
    ["accessories", ["belt", "hat", "cap", "scarf", "jewellery", "jewelry"]],
    ["lingerie", ["lingerie", "bra", "knickers", "panties"]],
    ["swimwear", ["swim", "bikini", "swimsuit"]],
    ["activewear", ["active", "gym", "sports", "legging"]],
  ];

  for (const [category, keys] of rules) {
    if (keys.some((k) => text.includes(k))) return category;
  }

  return null;
};

module.exports = { deriveCategory };
