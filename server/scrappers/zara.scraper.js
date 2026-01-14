// server/scrappers/zara.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");
const { parsePriceToNumber, calcDiscountPercent } = require("../utils/price");
const { deriveCategory } = require("../utils/category");

const STORE = "zara";
const STORE_NAME = "Zara";
const CURRENCY = "GBP";

const DEFAULT_START_URLS = ["https://www.zara.com/uk/en/s-woman-l8631.html"];

const clickCookiesIfPresent = async (page) => {
  const candidates = [
    'button:has-text("ACCEPT")',
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button:has-text("AGREE")',
    'button:has-text("Accept All")',
    '[id*="accept"]',
    '[class*="accept"] button',
    '[aria-label*="accept" i]',
  ];

  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ timeout: 2000 });
        await page.waitForTimeout(800);
        return;
      }
    } catch {}
  }
};

const normalizeSize = (raw = "") => {
  const t = String(raw).toUpperCase().replace(/\s+/g, "").trim();
  const map = {
    XS: "XS",
    S: "S",
    M: "M",
    L: "L",
    XL: "XL",
    XXL: "XXL",
    XXXL: "XXXL",
  };
  return map[t] || null;
};

const extractSizesBestEffort = async (page) => {
  // Try to force the size picker to render by clicking "Add"
  try {
    const addBtn =
      (await page.$('button:has-text("Add")')) ||
      (await page.$('button:has-text("ADD")')) ||
      (await page.$('[aria-label*="add" i]'));

    if (addBtn) {
      await addBtn.click({ timeout: 1500 });
      await page.waitForTimeout(800);
    }
  } catch {}

  const sizesRaw = await page.evaluate(() => {
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

    const roots = [
      document.querySelector('[class*="size" i]'),
      document.querySelector('[data-qa*="size" i]'),
      document.querySelector('[aria-label*="size" i]'),
      document.body,
    ].filter(Boolean);

    const pickTexts = (root) =>
      Array.from(
        root.querySelectorAll("button, [role='option'], li, label, span")
      )
        .map((el) => clean(el.textContent))
        .filter(Boolean);

    const texts = roots.flatMap(pickTexts);

    // pull common tokens (don’t overfit to Zara markup)
    const tokens = [];
    for (const t of texts) {
      // exact tokens
      if (["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(t))
        tokens.push(t);
      // sometimes size strings include extra info
      const m = t.match(/\b(XXXL|XXL|XL|XS|S|M|L)\b/g);
      if (m) tokens.push(...m);
    }

    // uniq
    return Array.from(new Set(tokens));
  });

  const sizes = Array.from(
    new Set(sizesRaw.map(normalizeSize).filter(Boolean))
  );

  return { sizesRaw, sizes };
};

const extractDetail = async ({ page }) => {
  await page.waitForTimeout(700);

  const raw = await page.evaluate(() => {
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

    const title =
      clean(document.querySelector("h1")?.textContent) ||
      clean(document.querySelector('meta[property="og:title"]')?.content);

    const ogImage = document.querySelector(
      'meta[property="og:image"]'
    )?.content;

    // Try to gather multiple images (Zara gallery varies)
    const imgs = Array.from(document.querySelectorAll("img[src], img[srcset]"))
      .map((img) => {
        const src =
          img.getAttribute("src") ||
          (img.getAttribute("srcset")
            ? img
                .getAttribute("srcset")
                .split(",")
                .map((s) => s.trim().split(" ")[0])
                .filter(Boolean)[0]
            : "");
        return src;
      })
      .filter(Boolean);

    const images = Array.from(
      new Set([ogImage, ...imgs].filter(Boolean))
    ).slice(0, 12);

    const pageText = clean(document.body?.textContent || "");
    const gbpMatches =
      pageText.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*GBP/gi) || [];
    const nums = gbpMatches
      .map((m) => m.replace(/GBP/gi, "").trim())
      .map((s) => s.replace(",", "."))
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));

    // Heuristic:
    // - price = last GBP number seen on the PDP
    // - originalPrice = first GBP number if different
    let originalPrice = null;
    let price = null;

    if (nums.length === 1) {
      price = nums[0];
    } else if (nums.length >= 2) {
      originalPrice = nums[0];
      price = nums[nums.length - 1];
      if (originalPrice === price) originalPrice = null;
    }

    // Color often appears like: "Black | 1255/829/800"
    let currentColor = null;
    const colorSkuMatch = pageText.match(
      /([A-Za-z][A-Za-z\s-]{1,40})\s*\|\s*\d{4}\/\d{3}\/\d{3}/
    );
    if (colorSkuMatch && colorSkuMatch[1])
      currentColor = clean(colorSkuMatch[1]);

    // Some PDPs list colors as bullets/buttons; grab short candidate strings near the title area
    const colorCandidates = Array.from(
      document.querySelectorAll("button, li, span, p")
    )
      .map((el) => clean(el.textContent))
      .filter((t) => t && t.length >= 3 && t.length <= 25);

    // crude filter: keep distinct, alphabetic-ish, not prices
    const colors = Array.from(
      new Set(
        colorCandidates.filter((t) => {
          if (/GBP/i.test(t)) return false;
          if (/\d/.test(t)) return false;
          if (/add|bag|help|measure|availability|log in/i.test(t)) return false;
          return true;
        })
      )
    ).slice(0, 12);

    const finalColors = Array.from(
      new Set([currentColor, ...colors].filter(Boolean))
    );

    return {
      title,
      price,
      originalPrice,
      images,
      colors: finalColors,
      productUrl: location.href,
    };
  });

  const discountPercent = calcDiscountPercent({
    price: raw.price,
    originalPrice: raw.originalPrice,
  });

  return {
    title: raw.title,
    price: raw.price,
    originalPrice: raw.originalPrice,
    discountPercent,
    image: raw.images?.[0] || "",
    images: raw.images || [],
    colors: raw.colors || [],
    productUrl: raw.productUrl,
  };
};

const runZaraCrawl = async ({
  startUrls = DEFAULT_START_URLS,
  maxRequestsPerCrawl = 120,
  maxProducts = 250,
  debug = true,
} = {}) => {
  const results = [];
  const now = new Date().toISOString();

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,
    requestHandlerTimeoutSecs: 120,

    async requestHandler({ page, request, enqueueLinks }) {
      await clickCookiesIfPresent(page);

      if (request.label === "LIST") {
        // Zara product URLs look like: /uk/en/<slug>-p01234567.html
        const productLinkSelector = 'main a[href*="-p"][href$=".html"]';

        await page.waitForSelector(productLinkSelector, { timeout: 30000 });
        if (debug) console.log("ZARA: Found listing links ✅");

        await enqueueLinks({
          selector: productLinkSelector,
          label: "DETAIL",
        });

        return;
      }

      if (request.label === "DETAIL") {
        const detail = await extractDetail({ page });

        if (
          !detail.title ||
          typeof detail.price !== "number" ||
          !detail.image ||
          !detail.productUrl
        ) {
          if (debug) console.log("ZARA: DETAIL SKIP ❌", request.url);
          return;
        }

        const { sizesRaw, sizes } = await extractSizesBestEffort(page);

        const canonicalKey = makeCanonicalKey({
          store: STORE,
          productUrl: detail.productUrl,
        });

        const category = deriveCategory({
          title: detail.title,
          productUrl: detail.productUrl,
        });

        const product = {
          canonicalKey,
          store: STORE,
          storeName: STORE_NAME,
          title: detail.title,
          price: detail.price,
          currency: CURRENCY,
          originalPrice: detail.originalPrice || null,
          discountPercent: detail.discountPercent,
          image: detail.image,
          images: detail.images || [],
          productUrl: detail.productUrl,
          saleUrl: request.userData?.saleUrl || startUrls[0],
          category,
          gender: "women",
          colors: detail.colors || [],
          sizesRaw: sizesRaw || [],
          sizes: sizes || [],
          inStock: true,
          status: "active",
          lastSeenAt: now,
        };

        results.push(product);

        if (debug) {
          console.log("ZARA: DETAIL ✅", {
            title: product.title,
            price: product.price,
            originalPrice: product.originalPrice,
            discountPercent: product.discountPercent,
            category: product.category,
            colors: product.colors,
            sizes: product.sizes,
            productUrl: product.productUrl,
          });
        }

        if (results.length >= maxProducts) {
          if (debug) console.log("ZARA: Reached maxProducts ✅", maxProducts);
          return;
        }
      }
    },
  });

  await crawler.run(
    startUrls.map((url) => ({
      url,
      label: "LIST",
      userData: { saleUrl: url },
    }))
  );

  // dedupe by canonicalKey
  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);
  const products = Array.from(map.values());

  if (debug) {
    console.log("\n=== ZARA FINAL RESULTS ===");
    console.log("TOTAL:", products.length);
    console.log(JSON.stringify(products.slice(0, 5), null, 2));
    console.log("=== END ===\n");
  }

  return products;
};

module.exports = { runZaraCrawl };
