// server/scrappers/plt.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");
const { parsePriceToNumber, calcDiscountPercent } = require("../utils/price");
const { deriveCategory } = require("../utils/category");

const STORE = "prettylittlething";
const STORE_NAME = "PrettyLittleThing";
const CURRENCY = "GBP";

const DEFAULT_START_URLS = ["https://www.prettylittlething.com/sale.html"];

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const cleanText = (t) => (t || "").replace(/\s+/g, " ").trim();

const normalizeSizeToken = (t) => {
  const s = cleanText(t).toUpperCase();

  // only keep the common alpha sizes you asked for
  const allowed = new Set(["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]);
  if (allowed.has(s)) return s;

  // ignore numeric sizes (4, 6, 8...) for now
  return null;
};

const normalizeSizes = (sizesRaw) =>
  uniq((sizesRaw || []).map(normalizeSizeToken)).filter(Boolean);

const mapBreadcrumbToCategory = (crumbs = []) => {
  const text = crumbs.join(" ").toLowerCase();

  const rules = [
    ["hoodies", ["hoodie", "hoody"]],
    ["sweatshirts", ["sweatshirt"]],
    ["jumpers", ["jumper", "knit", "cardigan"]],
    [
      "coats-jackets",
      ["coat", "jacket", "blazer", "puffer", "parka", "aviator"],
    ],
    ["dresses", ["dress"]],
    ["tops", ["top", "tops", "long sleeved tops", "bodysuit", "corset"]],
    ["t-shirts", ["t-shirt", "tee"]],
    ["shirts", ["shirt"]],
    ["trousers", ["trouser", "pants", "cargo", "wide-leg", "legging"]],
    ["jeans", ["jean", "denim"]],
    ["skirts", ["skirt"]],
    ["shorts", ["shorts"]],
    ["shoes", ["heels", "trainers", "sneakers", "boots", "sandals"]],
    ["bags", ["bag", "handbag", "tote"]],
    [
      "accessories",
      ["accessories", "belt", "hat", "cap", "scarf", "jewellery", "jewelry"],
    ],
    ["lingerie", ["lingerie", "bra", "knickers", "panties"]],
    ["swimwear", ["swim", "bikini", "swimsuit"]],
    ["activewear", ["active", "gym", "sports"]],
  ];

  for (const [category, keys] of rules) {
    if (keys.some((k) => text.includes(k))) return category;
  }

  return null;
};

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

const scrollToLoadMore = async ({ page, productSelector, maxScrolls = 10 }) => {
  let lastCount = 0;

  for (let i = 0; i < maxScrolls; i++) {
    const count = await page.locator(productSelector).count();
    if (count > 0 && count === lastCount) break;
    lastCount = count;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
  }
};

const extractDetail = async ({ page }) => {
  // ensure at least something is on the page
  await page.waitForTimeout(600);

  // if the site shows "SELECT A SIZE" button that opens a picker, try to open it so sizes exist in DOM
  try {
    const openSizeBtn = await page.$('#pdp-atb-button:has-text("Select")');
    if (openSizeBtn) {
      await openSizeBtn.click({ timeout: 1200 });
      await page.waitForTimeout(600);
    }
  } catch {}

  const raw = await page.evaluate(() => {
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();

    const title =
      clean(document.querySelector("#pdp-name")?.textContent) ||
      clean(document.querySelector("h1")?.textContent) ||
      clean(
        document.querySelector('[data-testid="product-name"]')?.textContent
      );

    const priceP =
      document.querySelector("#pdp-price p") ||
      document.querySelector('[data-testid="product-price"]') ||
      document.querySelector('[class*="price"]');

    const originalEl = priceP?.querySelector("s");
    const originalPriceText = clean(originalEl?.textContent);

    let currentPriceText = "";
    if (priceP) {
      const full = clean(priceP.textContent);
      currentPriceText = originalPriceText
        ? clean(full.replace(originalPriceText, ""))
        : full;
    }

    // images: keep only product-ish cdn images, exclude swatches/payment/icons
    const imgs = Array.from(document.querySelectorAll("img[src]"))
      .map((img) => img.getAttribute("src") || "")
      .filter(Boolean)
      .filter(
        (src) => src.includes("cdn-") || src.includes("prettylittlething")
      )
      .filter((src) => !src.includes("/swatches/"))
      .filter((src) => !src.includes("paymenticons"))
      .filter((src) => !src.includes("was-img"))
      .filter((src) => !src.includes(".svg"))
      .slice(0, 12);

    const image = imgs[0] || "";

    // breadcrumb/category hints
    const crumbs = Array.from(
      document.querySelectorAll(
        'nav[aria-label*="breadcrumb" i] a, [class*="breadcrumb" i] a, ol li a'
      )
    )
      .map((a) => clean(a.textContent))
      .filter(Boolean)
      .slice(0, 12);

    // colors: usually swatch images under /swatches/ with file names (white.jpg, monochrome.jpg)
    const swatchSrcs = Array.from(
      document.querySelectorAll('img[src*="/swatches/"]')
    )
      .map((img) => ({
        alt: clean(img.getAttribute("alt") || ""),
        src: img.getAttribute("src") || "",
      }))
      .filter((x) => x.src);

    const colorsFromSwatches = swatchSrcs
      .map((x) => {
        if (x.alt) return x.alt;
        const m = x.src.match(/\/swatches\/([^/?#]+)\.(jpg|jpeg|png|webp)/i);
        if (!m) return null;
        return m[1].replace(/[-_]+/g, " ");
      })
      .filter(Boolean);

    // sizes: only grab tokens that look like XS/S/M/L/XL (avoid "search", "size guide", etc)
    const sizeTokens = Array.from(
      document.querySelectorAll("button, [role='button'], a")
    )
      .map((el) => clean(el.textContent))
      .filter(Boolean)
      .filter((t) => /^(XXS|XS|S|M|L|XL|XXL|XXXL)$/i.test(t));

    return {
      title,
      currentPriceText,
      originalPriceText,
      productUrl: location.href,
      image,
      images: imgs,
      crumbs,
      colorsRaw: colorsFromSwatches,
      sizesRaw: sizeTokens,
    };
  });

  const price = parsePriceToNumber(raw.currentPriceText);
  const originalPrice = parsePriceToNumber(raw.originalPriceText);
  const discountPercent = calcDiscountPercent({ price, originalPrice });

  return {
    title: raw.title,
    price,
    originalPrice,
    discountPercent,
    image: raw.image,
    images: raw.images || [],
    productUrl: raw.productUrl,
    crumbs: raw.crumbs || [],
    colorsRaw: raw.colorsRaw || [],
    sizesRaw: raw.sizesRaw || [],
  };
};

const runPltScraper = async ({
  startUrls = DEFAULT_START_URLS,
  maxRequestsPerCrawl = 120,
  maxProducts = 200,
  debug = true,
} = {}) => {
  const results = [];
  const now = new Date().toISOString();
  const saleUrl = startUrls[0];

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,
    requestHandlerTimeoutSecs: 120,

    async requestHandler({ page, request, enqueueLinks }) {
      await clickCookiesIfPresent(page);

      if (request.label === "LIST") {
        const productSelector =
          '#plp-product-list div[data-testid="product-card"]';

        await page.waitForSelector(productSelector, { timeout: 30000 });

        // load more cards on the sale page
        await scrollToLoadMore({ page, productSelector, maxScrolls: 12 });

        if (debug) {
          const count = await page.locator(productSelector).count();
          console.log(`Found product cards ✅ (${count})`);
        }

        await enqueueLinks({
          selector: `${productSelector} a[href$=".html"]`,
          label: "DETAIL",
        });

        return;
      }

      if (request.label === "DETAIL") {
        if (results.length >= maxProducts) return;

        const detail = await extractDetail({ page });

        if (
          !detail.title ||
          typeof detail.price !== "number" ||
          !detail.image
        ) {
          if (debug) console.log("DETAIL SKIP ❌", detail.productUrl);
          return;
        }

        const canonicalKey = makeCanonicalKey({
          store: STORE,
          productUrl: detail.productUrl,
        });

        const category =
          deriveCategory({
            title: detail.title,
            productUrl: detail.productUrl,
          }) || mapBreadcrumbToCategory(detail.crumbs);

        const colors = uniq(detail.colorsRaw)
          .map((c) => cleanText(c))
          .filter(Boolean)
          .filter((c) => c.length <= 30)
          .filter((c) => !/search|size guide|previous|next/i.test(c));

        const sizesRaw = uniq(detail.sizesRaw);
        const sizes = normalizeSizes(sizesRaw);

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
          images: uniq(
            detail.images && detail.images.length
              ? detail.images
              : [detail.image]
          ),
          productUrl: detail.productUrl,
          saleUrl,
          category,
          gender: "women",
          colors,
          sizesRaw,
          sizes,
          inStock: true,
          status: "active",
          lastSeenAt: now,
        };

        results.push(product);

        if (debug) {
          console.log("DETAIL ✅", product);
          console.log(
            `${product.title} => category: ${
              product.category
            } | sizes: ${product.sizes.join(
              ", "
            )} | colors: ${product.colors.join(", ")}`
          );
        }
      }
    },
  });

  await crawler.run(
    startUrls.map((url) => ({
      url,
      label: "LIST",
    }))
  );

  const map = new Map();
  for (const p of results) map.set(p.canonicalKey, p);
  const products = Array.from(map.values());

  if (debug) {
    console.log("\n=== FINAL RESULTS ===");
    console.log("TOTAL:", products.length);
    console.log(JSON.stringify(products.slice(0, 5), null, 2));
    console.log("=== END ===\n");
  }

  return products;
};

// keep compatibility if anything still imports runPltCrawl
module.exports = { runPltScraper, runPltCrawl: runPltScraper };
