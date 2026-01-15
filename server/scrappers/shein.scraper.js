// server/scrappers/shein.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const readline = require("readline");

const { makeCanonicalKey } = require("../utils/canonical");
const { parsePriceToNumber, calcDiscountPercent } = require("../utils/price");
const { deriveCategory } = require("../utils/category");

const STORE = "shein";
const STORE_NAME = "SHEIN";
const CURRENCY = "GBP";

const DEFAULT_START_URLS = [
  "https://www.shein.co.uk/sale/All-Sale-sc-0051884505.html",
];

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
const cleanText = (t) => (t || "").replace(/\s+/g, " ").trim();

const toAbsUrl = (u) => {
  const s = cleanText(u);
  if (!s) return "";
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `https://www.shein.co.uk${s}`;
  return s;
};

const isRiskUrl = (u) => {
  const s = (u || "").toLowerCase();
  return (
    s.includes("/risk/") || s.includes("challenge") || s.includes("captcha")
  );
};

// (A) lower concurrency + (B) throttle with jitter
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const politeDelay = async (label) => {
  if (label === "LIST") await sleep(rand(700, 1500));
  if (label === "DETAIL") await sleep(rand(1100, 2600));
};

// ----- Manual captcha pause helpers -----
const waitForEnter = (prompt) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });

const looksLikeCaptcha = async (page) => {
  // URL-based
  if (isRiskUrl(page.url())) return true;

  // Text-based (SHEIN challenge modals often have this)
  try {
    const modalText = page.locator("text=Please select the following graphics");
    if (await modalText.count()) return true;
  } catch {}

  return false;
};

const bringCaptchaIntoView = async (page) => {
  // Make it easier to see a bottom-positioned captcha
  try {
    await page.setViewportSize({ width: 1400, height: 900 });
  } catch {}

  try {
    // Zoom out a bit so bottom modal is visible
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.zoom = "0.85";
    });
  } catch {}

  try {
    // Scroll down to where these challenge modals often sit
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  } catch {}

  await page.waitForTimeout(500);
};

const pauseForManualCaptchaSolve = async ({
  page,
  request,
  debug,
  maxWaitMs = 10 * 60 * 1000,
}) => {
  const isCaptcha = await looksLikeCaptcha(page);
  if (!isCaptcha) return false;

  if (debug) {
    console.log("\n⚠️  CAPTCHA/CHALLENGE DETECTED");
    console.log("   URL:", page.url());
    console.log("   Request:", request.url);
    console.log("   The browser is OPEN (headed). Solve the captcha there.");
    console.log(
      "   DO NOT press CTRL+C (it closes the browser and Crawlee will reclaim the request).\n"
    );
  }

  await bringCaptchaIntoView(page);

  const start = Date.now();

  const autoDetect = (async () => {
    while (Date.now() - start < maxWaitMs) {
      await page.waitForTimeout(1000);

      // If challenge is gone, continue
      const stillCaptcha = await looksLikeCaptcha(page);
      if (!stillCaptcha) return "AUTO_DETECTED_RESOLVED";

      // Sometimes after solve, it redirects but needs a moment
      // Keep scrolling occasionally to keep modal visible
      await bringCaptchaIntoView(page);
    }
    return "AUTO_DETECT_TIMEOUT";
  })();

  const manual = waitForEnter(
    "✅ After solving the captcha in the browser, press ENTER here to continue...\n"
  );

  const winner = await Promise.race([autoDetect, manual]);

  // If user pressed Enter but challenge still there, give a short extra grace period
  if (winner === undefined) {
    const stillCaptcha = await looksLikeCaptcha(page);
    if (stillCaptcha) {
      if (debug)
        console.log(
          "Still on challenge page — waiting a bit more for redirect..."
        );
      const extraStart = Date.now();
      while (Date.now() - extraStart < 30_000) {
        await page.waitForTimeout(1000);
        if (!(await looksLikeCaptcha(page))) break;
      }
    }
  }

  if (debug) console.log("✅ Continuing crawl...\n");
  return true;
};

// ----- existing parsing helpers -----
const normalizeSizeToken = (t) => {
  const s = cleanText(t);
  if (!s) return null;

  const upper = s.toUpperCase();

  if (
    upper === "SIZE" ||
    upper.includes("SELECT SIZE") ||
    upper.includes("PLEASE SELECT") ||
    upper.includes("CHOOSE SIZE")
  ) {
    return null;
  }

  const alpha = new Set(["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]);
  if (alpha.has(upper)) return upper;

  if (/^\d{1,3}$/.test(upper)) return upper;
  if (/^ONE\s?SIZE$/i.test(upper)) return "ONE-SIZE";

  // 500ML / 150ML / 1L / 12OZ
  if (/^[0-9]{1,4}\s?(ML|L|OZ)$/i.test(upper)) return upper.replace(/\s+/g, "");

  if (upper.length > 30) return null;
  return upper;
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
    ["dresses", ["dress"]],
    ["tops", ["top", "bodysuit", "corset"]],
    ["t-shirts", ["t-shirt", "tee"]],
    ["shirts", ["shirt"]],
    ["trousers", ["trouser", "pants", "cargo", "chino", "jogger"]],
    ["jeans", ["jean", "denim"]],
    ["skirts", ["skirt"]],
    ["shorts", ["shorts"]],
    [
      "shoes",
      ["shoe", "boot", "trainer", "sneaker", "loafer", "sandal", "heel"],
    ],
    ["bags", ["bag", "handbag", "tote"]],
    [
      "accessories",
      ["accessories", "belt", "hat", "cap", "scarf", "jewellery", "jewelry"],
    ],
    ["home-living", ["home", "living", "kitchen", "bathroom", "decor"]],
    ["beauty", ["beauty", "makeup", "skincare"]],
  ];

  for (const [category, keys] of rules) {
    if (keys.some((k) => text.includes(k))) return category;
  }
  return null;
};

const clickCookiesIfPresent = async (page) => {
  const candidates = [
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("I agree")',
    'button:has-text("Agree")',
    '[id*="accept" i]',
    '[class*="accept" i] button',
    '[aria-label*="accept" i]',
  ];

  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ timeout: 1500 });
        await page.waitForTimeout(400);
        return;
      }
    } catch {}
  }
};

const closePopupsIfPresent = async (page) => {
  const candidates = [
    '[aria-label*="close" i]',
    'button:has-text("Close")',
    'button:has-text("No thanks")',
    'button:has-text("Not now")',
    'button:has-text("Later")',
    ".c-modal__close, .modal__close, .close, .close-btn",
  ];

  for (const sel of candidates) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click({ timeout: 1200 });
        await page.waitForTimeout(250);
        return;
      }
    } catch {}
  }
};

const blockHeavyResources = async (page) => {
  await page.route("**/*", (route) => {
    const r = route.request();
    const type = r.resourceType();
    const url = r.url().toLowerCase();

    // keep scripts + xhr/fetch so app works
    if (
      type === "script" ||
      type === "xhr" ||
      type === "fetch" ||
      type === "document"
    ) {
      return route.continue();
    }

    // cut memory + bandwidth
    if (["image", "media", "font", "stylesheet"].includes(type))
      return route.abort();
    if (url.includes("doubleclick") || url.includes("google-analytics"))
      return route.abort();

    return route.continue();
  });
};

const scrollToLoadMore = async ({ page, productSelector, maxScrolls = 8 }) => {
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
  await page.waitForTimeout(900);

  const raw = await page.evaluate(() => {
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
    const abs = (u) => {
      const s = clean(u);
      if (!s) return "";
      if (s.startsWith("//")) return `https:${s}`;
      if (s.startsWith("/")) return `https://www.shein.co.uk${s}`;
      return s;
    };

    const title =
      clean(document.querySelector("h1")?.textContent) ||
      clean(
        document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute("content")
      );

    const allText = clean(document.body?.innerText || "");

    const priceText =
      clean(
        document.querySelector('[class*="product-intro__price" i]')?.textContent
      ) ||
      clean(document.querySelector('[class*="price" i]')?.textContent) ||
      clean(
        document
          .querySelector('meta[property="product:price:amount"]')
          ?.getAttribute("content")
      ) ||
      "";

    const originalText =
      clean(document.querySelector('[class*="del" i]')?.textContent) ||
      clean(document.querySelector('[class*="original" i]')?.textContent) ||
      "";

    const thumbUrls = Array.from(
      document.querySelectorAll("[data-before-crop-src]")
    )
      .map((el) => abs(el.getAttribute("data-before-crop-src")))
      .filter(Boolean);

    const ogImage = abs(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content")
    );
    const images = [ogImage, ...thumbUrls].filter(Boolean);
    const image = images[0] || "";

    const crumbs = Array.from(
      document.querySelectorAll(
        'nav[aria-label*="breadcrumb" i] a, [class*="bread" i] a, [class*="crumb" i] a'
      )
    )
      .map((a) => clean(a.textContent))
      .filter(Boolean)
      .slice(0, 12);

    let color =
      clean(
        document.querySelector('[class*="color" i] [class*="selected" i]')
          ?.textContent
      ) ||
      clean(
        document.querySelector('[class*="colour" i] [class*="selected" i]')
          ?.textContent
      ) ||
      "";

    if (!color) {
      const m = allText.match(/COLOU?R\s*:\s*([A-Z0-9][A-Z0-9 \-]+)/i);
      color = m ? clean(m[1]) : "";
    }

    // sizes (robust)
    const sizeCandidates = [];
    const push = (v) => {
      const t = clean(v);
      if (!t) return;
      if (/^size$/i.test(t)) return;
      if (/select size/i.test(t)) return;
      sizeCandidates.push(t);
    };

    document
      .querySelectorAll(
        ".product-intro__size-choose .size-radio, [class*='size-choose' i] .size-radio"
      )
      .forEach((el) => {
        push(el.getAttribute("data-attr_value_name"));
        push(el.getAttribute("data-attr_value"));
        push(el.getAttribute("aria-label"));
        push(el.querySelector("p")?.textContent);
        push(el.textContent);
      });

    document
      .querySelectorAll("[data-attr_value_name]")
      .forEach((el) => push(el.getAttribute("data-attr_value_name")));
    document
      .querySelectorAll("[data-attr_value]")
      .forEach((el) => push(el.getAttribute("data-attr_value")));

    document
      .querySelectorAll(
        ".product-intro__size-radio-inner, [class*='size-radio-inner' i], [class*='size-radio' i] p"
      )
      .forEach((el) => push(el.textContent));

    const sizesRaw = Array.from(new Set(sizeCandidates)).filter(Boolean);

    const inStock = !/out of stock|sold out/i.test(allText);

    return {
      title,
      priceText,
      originalText,
      productUrl: location.href,
      image,
      images,
      crumbs,
      color,
      sizesRaw,
      inStock,
    };
  });

  const price = parsePriceToNumber(raw.priceText);
  const originalPrice = parsePriceToNumber(raw.originalText);
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

const runSheinScraper = async ({
  startUrls = DEFAULT_START_URLS,
  maxRequestsPerCrawl = 120,
  maxProducts = 80,
  debug = true,
} = {}) => {
  const results = [];
  const now = new Date().toISOString();
  const saleUrl = startUrls[0];

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,

    // ✅ allow time for manual captcha solve
    requestHandlerTimeoutSecs: 10 * 60,

    // A) lower concurrency
    maxConcurrency: 1,

    // ✅ headed
    launchContext: {
      launchOptions: {
        headless: false,
        args: ["--start-maximized"],
      },
    },

    // ✅ set viewport here (fixes your browserNewContextOptions error)
    preNavigationHooks: [
      async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 900 });
        await blockHeavyResources(page);
      },
    ],

    async requestHandler({ page, request, enqueueLinks }) {
      await politeDelay(request.label);

      // ✅ if challenge appears, pause + let user solve, then continue
      await pauseForManualCaptchaSolve({ page, request, debug });

      await clickCookiesIfPresent(page);
      await closePopupsIfPresent(page);

      // ✅ if challenge pops after clicks, pause again
      await pauseForManualCaptchaSolve({ page, request, debug });

      if (request.label === "LIST") {
        const productSelector =
          "a.S-product-card__img-container, a[class*='product-card__img-container'], a[href*='-p-']";

        await page.waitForTimeout(1200);

        // If list page becomes a challenge mid-run, pause there too
        await pauseForManualCaptchaSolve({ page, request, debug });

        await scrollToLoadMore({ page, productSelector, maxScrolls: 8 });

        await enqueueLinks({
          selector: productSelector,
          label: "DETAIL",
          transformRequestFunction: (req) => {
            const url = toAbsUrl(req.url);
            if (!url) return null;
            return { url, label: "DETAIL" };
          },
        });

        if (debug) {
          const count = await page.locator(productSelector).count();
          console.log(`Found product cards ✅ (${count})`);
        }
        return;
      }

      if (request.label === "DETAIL") {
        if (results.length >= maxProducts) return;

        // If it redirected to challenge, we already paused above.
        // Continue with extraction when page is normal again.
        await pauseForManualCaptchaSolve({ page, request, debug });

        const detail = await extractDetail({ page });

        if (
          !detail.title ||
          typeof detail.price !== "number" ||
          !detail.image
        ) {
          if (debug)
            console.log("DETAIL SKIP ❌", detail.productUrl || request.url);
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
          discountPercent: detail.discountPercent ?? null,
          image: detail.image,
          images: uniq(
            detail.images && detail.images.length
              ? detail.images
              : [detail.image]
          ),
          productUrl: detail.productUrl,
          saleUrl,
          category,
          gender: null,
          colors,
          sizesRaw,
          sizes: sizes.length ? sizes : sizesRaw,
          inStock: detail.inStock,
          status: "active",
          lastSeenAt: now,
        };

        console.log(product);
        results.push(product);

        if (debug)
          console.log("DETAIL ✅", detail.title, "| sizes:", product.sizes);
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

module.exports = { runSheinScraper, runSheinCrawl: runSheinScraper };
