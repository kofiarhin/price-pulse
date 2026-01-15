// server/scrappers/boohoo.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");
const { parsePriceToNumber, calcDiscountPercent } = require("../utils/price");
const { deriveCategory } = require("../utils/category");

const STORE = "boohooman";
const STORE_NAME = "boohooMAN";
const CURRENCY = "GBP";

const DEFAULT_START_URLS = ["https://www.boohooman.com/mens/sale"];

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
const cleanText = (t) => (t || "").replace(/\s+/g, " ").trim();

const toAbsUrl = (u) => {
  const s = cleanText(u);
  if (!s) return "";
  if (s.startsWith("//")) return `https:${s}`;
  return s;
};

const normalizeSizeToken = (t) => {
  const s = cleanText(t).toUpperCase();
  const alpha = new Set(["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]);
  if (alpha.has(s)) return s;
  if (/^\d{1,3}$/.test(s)) return s; // waist sizes etc
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
    ["coats-jackets", ["coat", "jacket", "blazer", "puffer", "parka"]],
    ["t-shirts", ["t-shirt", "tee"]],
    ["shirts", ["shirt"]],
    ["jeans", ["jean", "denim"]],
    ["trousers", ["trouser", "pants", "cargo", "chino"]],
    ["shorts", ["shorts"]],
    ["tracksuits", ["tracksuit"]],
    ["shoes", ["shoe", "boot", "trainer", "sneaker", "loafer", "sandal"]],
    ["accessories", ["accessories", "belt", "hat", "cap", "bag"]],
  ];

  for (const [category, keys] of rules) {
    if (keys.some((k) => text.includes(k))) return category;
  }
  return null;
};

const clickCookiesIfPresent = async (page) => {
  const candidates = [
    'button:has-text("Accept")',
    'button:has-text("ACCEPT")',
    'button:has-text("Accept All")',
    'button:has-text("I agree")',
    '[id*="accept" i]',
    '[class*="accept" i] button',
    '[aria-label*="accept" i]',
  ];

  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ timeout: 2000 });
        await page.waitForTimeout(700);
        return;
      }
    } catch {}
  }
};

const scrollToLoadMore = async ({ page, productSelector, maxScrolls = 12 }) => {
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
  await page.waitForTimeout(600);

  const raw = await page.evaluate(() => {
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
    const abs = (u) => {
      const s = clean(u);
      if (!s) return "";
      if (s.startsWith("//")) return `https:${s}`;
      return s;
    };

    const title =
      clean(document.querySelector("h1")?.textContent) ||
      clean(document.querySelector('[itemprop="name"]')?.textContent) ||
      clean(document.querySelector("#pdp-name")?.textContent);

    const priceMeta =
      document.querySelector('[itemprop="price"][content]') ||
      document.querySelector('meta[itemprop="price"][content]');

    const currentPriceText =
      (priceMeta && priceMeta.getAttribute("content")) ||
      clean(
        document.querySelector(".price-sales")?.textContent ||
          document.querySelector('[class*="price-sales"]')?.textContent ||
          ""
      );

    const originalPriceText = clean(
      document.querySelector(".price-standard")?.textContent ||
        document.querySelector("s")?.textContent ||
        ""
    );

    const crumbs = Array.from(
      document.querySelectorAll(
        'nav[aria-label*="breadcrumb" i] a, [class*="breadcrumb" i] a, ol.breadcrumb li a'
      )
    )
      .map((a) => clean(a.textContent))
      .filter(Boolean)
      .slice(0, 12);

    const contentText = clean(
      document.querySelector("#product-content")?.innerText ||
        document.querySelector(".pdp-main")?.innerText ||
        document.body.innerText ||
        ""
    );

    let color = clean(
      document.querySelector('[class*="colour" i] [class*="selected" i]')
        ?.textContent ||
        document.querySelector('[class*="color" i] [class*="selected" i]')
          ?.textContent ||
        ""
    );

    if (!color) {
      const m = contentText.match(/COLOU?R\s*:\s*([A-Z0-9][A-Z0-9 \-]+)/i);
      color = m ? clean(m[1]) : "";
    }

    const primary =
      document.querySelector("input.js-primary-image-default-url")?.value || "";

    const imgs = Array.from(document.querySelectorAll("img"))
      .flatMap((img) => {
        const src = img.getAttribute("src") || "";
        const srcset = img.getAttribute("srcset") || "";
        const firstFromSrcset =
          srcset.split(",")[0]?.trim()?.split(" ")[0] || "";
        return [src, firstFromSrcset];
      })
      .map(abs)
      .filter(Boolean)
      .filter((src) => src.includes("mediahub.boohooman.com"))
      .filter((src) => !src.includes(".svg"))
      .slice(0, 14);

    const images = [abs(primary), ...imgs].filter(Boolean);
    const image = images[0] || "";

    // ✅ FIXED SIZES (BoohooMAN uses .swatchanchor with data-variation-values JSON)
    const sizeTokens = Array.from(
      document.querySelectorAll(
        ".swatches.size .swatchanchor, .product-options .size .swatchanchor, .product-variations .swatchanchor"
      )
    )
      .filter((el) => {
        const li = el.closest("li");
        if (!li) return true;
        const cls = (li.getAttribute("class") || "").toLowerCase();
        return !cls.includes("unselectable") && !cls.includes("disabled");
      })
      .map((el) => {
        const json = el.getAttribute("data-variation-values");
        if (json) {
          try {
            const obj = JSON.parse(json);
            return clean(
              obj.attributeValue || obj.value || obj.displayValue || ""
            );
          } catch {}
        }
        return clean(el.textContent);
      })
      .filter(Boolean)
      .filter((t) => /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{1,3})$/i.test(t));

    const inStock = !/out of stock|sold out/i.test(contentText);

    return {
      title,
      currentPriceText,
      originalPriceText,
      productUrl: location.href,
      image,
      images,
      crumbs,
      color,
      sizesRaw: sizeTokens,
      inStock,
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
    image: toAbsUrl(raw.image),
    images: (raw.images || []).map(toAbsUrl).filter(Boolean),
    productUrl: raw.productUrl,
    crumbs: raw.crumbs || [],
    colorsRaw: raw.color ? [raw.color] : [],
    sizesRaw: raw.sizesRaw || [],
    inStock: !!raw.inStock,
  };
};

const runBoohooScraper = async ({
  startUrls = DEFAULT_START_URLS,
  maxRequestsPerCrawl = 140,
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
        const productSelector = ".search-result-items .grid-tile";

        await page.waitForSelector(productSelector, { timeout: 30000 });
        await scrollToLoadMore({ page, productSelector, maxScrolls: 12 });

        await enqueueLinks({
          selector: `${productSelector} a.thumb-link[href*=".html"]`,
          label: "DETAIL",
        });

        if (debug) {
          const count = await page.locator(productSelector).count();
          console.log(`Found product cards ✅ (${count})`);
        }

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
          .filter((c) => c.length <= 30);

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
          gender: "men",
          colors,
          sizesRaw,
          sizes: sizes.length ? sizes : sizesRaw,
          inStock: detail.inStock,
          status: "active",
          lastSeenAt: now,
        };

        console.dir(product, { depth: null, colors: true }); // ✅ inspect details

        results.push(product);

        if (debug) console.log("DETAIL ✅", detail.title);
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
  return Array.from(map.values());
};

module.exports = { runBoohooScraper, runBoohooCrawl: runBoohooScraper };
