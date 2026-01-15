const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");
const { parsePriceToNumber, calcDiscountPercent } = require("../utils/price");
const { deriveCategory } = require("../utils/category");

const STORE = "asos";
const STORE_NAME = "ASOS";
const CURRENCY = "GBP";

const DEFAULT_START_URLS = [
  "https://www.asos.com/women/sale/cat/?cid=7046",
  "https://www.asos.com/men/sale/cat/?cid=8409",
];

const stripHash = (u) => {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString();
  } catch {
    return (u || "").split("#")[0];
  }
};

const blockHeavyResources = async (page) => {
  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "media", "font"].includes(type)) return route.abort();
    return route.continue();
  });
};

const normalizeSizes = (sizesRaw = []) => {
  const out = new Set();
  for (const s of sizesRaw) {
    const t = String(s || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t || /please select/i.test(t)) continue;
    // Cleans "UK 6 - Low in stock" -> "UK 6"
    const cleanSize = t.split("-")[0].split("(")[0].trim();
    out.add(cleanSize);
  }
  return Array.from(out);
};

const extractDetail = async ({ page }) => {
  // Wait for the dropdown select from your screenshot
  try {
    await page.waitForSelector("#variantSelector", { timeout: 5000 });
  } catch (e) {}

  const raw = await page.evaluate(() => {
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

    const title =
      clean(document.querySelector("h1")?.textContent) ||
      clean(
        document.querySelector('[data-testid="product-title"]')?.textContent
      ) ||
      "";

    // Pull sizes from the <select id="variantSelector"> options
    const sizesRaw = Array.from(
      document.querySelectorAll("#variantSelector option")
    )
      .map((o) => clean(o.textContent))
      .filter((t) => t && !/please select/i.test(t));

    const currentPriceText =
      clean(
        document.querySelector('[data-testid="current-price"]')?.textContent
      ) || "";
    const previousPriceText =
      clean(
        document.querySelector('[data-testid="previous-price"]')?.textContent
      ) || "";
    const screenReaderPrice =
      clean(
        document.querySelector('[data-testid="price-screenreader-only-text"]')
          ?.textContent
      ) || "";

    const colourBlock = document.querySelector('[data-testid="productColour"]');
    let color = clean(colourBlock?.textContent);
    if (color && color.includes(":")) color = clean(color.split(":")[1]);

    const ogImage =
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") || "";

    return {
      title,
      color,
      currentPriceText,
      previousPriceText,
      screenReaderPrice,
      sizesRaw,
      image: ogImage,
      productUrl: location.href,
    };
  });

  let price = parsePriceToNumber(raw.currentPriceText);
  let originalPrice = parsePriceToNumber(raw.previousPriceText);

  if (typeof price !== "number" && raw.screenReaderPrice) {
    const nowMatch = raw.screenReaderPrice.match(/Now\s*£?\s*([\d.,]+)/i);
    if (nowMatch?.[1]) price = parsePriceToNumber(nowMatch[1]);
  }
  if (typeof originalPrice !== "number" && raw.screenReaderPrice) {
    const wasMatch = raw.screenReaderPrice.match(/Was\s*£?\s*([\d.,]+)/i);
    if (wasMatch?.[1]) originalPrice = parsePriceToNumber(wasMatch[1]);
  }

  return {
    ...raw,
    price,
    originalPrice,
    productUrl: stripHash(raw.productUrl),
  };
};

const runAsosCrawl = async ({
  startUrls = DEFAULT_START_URLS,
  maxRequestsPerCrawl = 100,
  maxProducts = 200,
  debug = true,
} = {}) => {
  const results = [];
  const now = new Date(); // Date object for Schema compatibility

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,
    maxConcurrency: 1,
    preNavigationHooks: [
      async ({ page }) => {
        await blockHeavyResources(page);
      },
    ],

    async requestHandler({ page, request, enqueueLinks }) {
      if (request.label === "LIST") {
        await page.waitForSelector('a[href*="/prd/"]', { timeout: 15000 });
        await enqueueLinks({
          selector: 'a[href*="/prd/"]',
          label: "DETAIL",
          transformRequestFunction: (req) => {
            req.url = stripHash(req.url);
            return req;
          },
        });
        return;
      }

      if (request.label === "DETAIL") {
        if (results.length >= maxProducts) return;

        const detail = await extractDetail({ page });

        if (!detail.title || typeof detail.price !== "number") return;

        const productUrl = detail.productUrl;
        const sizes = normalizeSizes(detail.sizesRaw);

        // ✅ EXACT MATCH FOR YOUR ProductSchema
        const product = {
          canonicalKey: makeCanonicalKey({ store: STORE, productUrl }), // Required & Indexed
          store: STORE, // Required
          storeName: STORE_NAME, // Required
          title: detail.title, // Required
          price: detail.price, // Required (Number)
          currency: CURRENCY, // Required
          originalPrice: detail.originalPrice || null,
          discountPercent: calcDiscountPercent({
            price: detail.price,
            originalPrice: detail.originalPrice,
          }),
          image: detail.image || "", // Required
          images: [detail.image].filter(Boolean),
          productUrl: productUrl, // Required
          saleUrl: request.userData?.saleUrl || startUrls[0], // Required
          category: deriveCategory({ title: detail.title, productUrl }),
          gender: productUrl.includes("/men") ? "men" : "women",
          colors: detail.color ? [detail.color] : [],
          sizesRaw: detail.sizesRaw,
          sizes: sizes,
          inStock: sizes.length > 0,
          status: "active",
          lastSeenAt: now, // Date object
        };

        results.push(product);
        if (debug)
          console.log(
            `✅ ${STORE_NAME}: ${product.title} | ${product.price} | Sizes: ${product.sizes.length}`
          );
      }
    },
  });

  await crawler.run(
    startUrls.map((url) => ({ url, label: "LIST", userData: { saleUrl: url } }))
  );

  const map = new Map();
  results.forEach((p) => map.set(p.canonicalKey, p));
  return Array.from(map.values());
};

module.exports = { runAsosCrawl };
