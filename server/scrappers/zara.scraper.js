// server/scrappers/zara.scraper.js
const { PlaywrightCrawler } = require("crawlee");
const { makeCanonicalKey } = require("../utils/canonical");
const { parsePriceToNumber, calcDiscountPercent } = require("../utils/price");
const { deriveCategory } = require("../utils/category");

const STORE = "zara";
const STORE_NAME = "Zara";
const CURRENCY = "GBP";

const DEFAULT_START_URLS = ["https://www.zara.com/uk/en/s-woman-l8631.html"];

const isLikelyProductUrl = (u = "") => {
  try {
    const url = new URL(u);
    const s = url.toString().toLowerCase();
    if (!s.includes("zara.com/uk/en/")) return false;
    if (/-l\d+\.html/.test(s)) return false;
    return /-p\d+\.html/.test(s) || /\/p\d+\.html/.test(s);
  } catch {
    return false;
  }
};

const stripQueryHash = (u) => {
  try {
    const url = new URL(u);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
};

const clickFirstVisible = async (pageOrFrame, selectors = [], opts = {}) => {
  const { timeout = 1500 } = opts;
  for (const sel of selectors) {
    try {
      const loc = pageOrFrame.locator(sel).first();
      if ((await loc.count()) > 0) {
        await loc.click({ timeout, force: true });
        return true;
      }
    } catch {}
  }
  return false;
};

const clickCookiesAndOverlays = async (page) => {
  const cookieSelectors = [
    "button#onetrust-accept-btn-handler",
    '[id*="onetrust-accept"]',
    'button:has-text("Accept all")',
    'button:has-text("ACCEPT ALL")',
    'button:has-text("Accept")',
    'button:has-text("ACCEPT")',
  ];

  const continueSelectors = [
    'button:has-text("Continue")',
    'button:has-text("CONTINUE")',
    'button:has-text("OK")',
  ];

  const closeSelectors = [
    'button[aria-label="Close"]',
    '[data-qa-action*="close"]',
    ".zds-modal__close",
  ];

  const frames = page.frames();
  for (const f of frames) {
    const clickedCookie = await clickFirstVisible(f, cookieSelectors, {
      timeout: 2000,
    });
    if (clickedCookie) await page.waitForTimeout(400);

    const clickedContinue = await clickFirstVisible(f, continueSelectors, {
      timeout: 1200,
    });
    if (clickedContinue) await page.waitForTimeout(300);

    const clickedClose = await clickFirstVisible(f, closeSelectors, {
      timeout: 1200,
    });
    if (clickedClose) await page.waitForTimeout(300);
  }
};

const normalizeSize = (raw = "") => {
  const t = String(raw).replace(/\s+/g, " ").trim().toUpperCase();
  if (!t) return null;

  if (/ONE\s*SIZE/.test(t) || /\bOS\b/.test(t)) return "ONE SIZE";

  const letter = t.match(/\b(XXXL|XXL|XL|XS|S|M|L)\b/);
  if (letter) return letter[1];

  const num = t.match(/\b(\d{2,3})\b/);
  if (num) return num[1];

  const token = t.split(" ")[0].replace(/[^A-Z0-9/]/g, "");
  return token || null;
};

const autoScrollUntilStable = async (
  page,
  { maxRounds = 18, stableRounds = 3 } = {}
) => {
  const countLinks = async () => {
    try {
      return await page.evaluate(() => {
        const abs = (href) => {
          try {
            return new URL(href, location.href).toString();
          } catch {
            return "";
          }
        };
        const anchors = Array.from(document.querySelectorAll("a[href]"));
        const urls = anchors
          .map((a) => abs(a.getAttribute("href") || ""))
          .filter(Boolean);

        const isProduct = (u) =>
          u.includes("zara.com/uk/en/") &&
          !/-l\d+\.html/i.test(u) &&
          /-p\d+\.html/i.test(u);

        const uniq = new Set();
        urls.forEach((u) => {
          const clean = u.split("#")[0].split("?")[0];
          if (isProduct(clean)) uniq.add(clean);
        });

        return uniq.size;
      });
    } catch {
      return 0;
    }
  };

  let prev = -1;
  let stable = 0;

  for (let i = 0; i < maxRounds; i++) {
    const current = await countLinks();
    if (current === prev) stable += 1;
    else stable = 0;

    if (stable >= stableRounds) break;

    prev = current;
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(650);
  }
};

// ✅ KEY FIX: Zara often only renders the size list after clicking "ADD"
const openSizeSelectorIfNeeded = async (page) => {
  const sizeListSel = 'ul[class*="size-selector-sizes"]';
  const sizeBtnSel = [
    'button[data-qa-action="size-in-stock"]',
    'button[class*="size-selector-sizes"][class*="__button"]',
    `${sizeListSel} button`,
  ].join(",");

  const hasVisibleSizeButtons = async () => {
    try {
      const loc = page.locator(sizeBtnSel).first();
      if ((await loc.count()) === 0) return false;
      return await loc.isVisible();
    } catch {
      return false;
    }
  };

  if (await hasVisibleSizeButtons()) return;

  const addSelectors = [
    'button[data-qa-action="add-to-cart"]',
    'button[data-qa-action="add-to-bag"]',
    ".product-detail-cart-buttons__main-action button",
    'button:has-text("ADD")',
    'button:has-text("Add")',
  ];

  for (const sel of addSelectors) {
    try {
      const btn = page.locator(sel).first();
      if ((await btn.count()) === 0) continue;
      if (!(await btn.isVisible().catch(() => false))) continue;

      await btn.click({ timeout: 2500, force: true });
      await page.waitForTimeout(350);

      // Wait for size UI to appear (if the product has sizes)
      await page
        .waitForSelector(sizeListSel, { timeout: 6500 })
        .catch(() => {});
      await page.waitForTimeout(450);

      if (await hasVisibleSizeButtons()) return;
    } catch {}
  }

  // fallback: sometimes size selector is behind a clickable block
  await clickFirstVisible(
    page,
    [
      '[data-qa-qualifier="product-detail-size-selector"] button',
      ".product-detail-info__size-selector button",
      ".size-selector button",
    ],
    { timeout: 2000 }
  );
  await page.waitForTimeout(350);
};

const extractDetail = async ({ page }) => {
  try {
    await page.waitForSelector(
      ".price-current__amount, .money-amount__main, .price__amount, .price-variant__price, meta[property='og:image']",
      { timeout: 12000 }
    );
  } catch {}
  try {
    await page.waitForSelector(
      'picture.media-image source[srcset], picture.media-image img[src], meta[property="og:image"]',
      { timeout: 6000 }
    );
  } catch {}

  const raw = await page.evaluate(() => {
    const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const absolutize = (u) => {
      const x = clean(u);
      if (!x) return "";
      try {
        return new URL(x, location.href).toString();
      } catch {
        return "";
      }
    };

    const pickBestFromSrcset = (srcset) => {
      const s = clean(srcset);
      if (!s) return "";
      const parts = s
        .split(",")
        .map((p) => clean(p))
        .filter(Boolean);
      if (!parts.length) return "";
      return clean(parts[parts.length - 1].split(" ")[0]);
    };

    const isZaraAsset = (u) =>
      /^https?:\/\//i.test(u) && /static\.zara\.net\/assets\/public\//i.test(u);

    const title =
      clean(document.querySelector("h1")?.textContent) ||
      clean(document.querySelector('meta[property="og:title"]')?.content) ||
      "";

    const ogImage = absolutize(
      document.querySelector('meta[property="og:image"]')?.content || ""
    );

    const currentPriceEl =
      document.querySelector(".price-current__amount .price-variant__price") ||
      document.querySelector(".price-current__amount .money-amount__main") ||
      document.querySelector(".money-amount__main") ||
      document.querySelector(".price__amount");

    const oldPriceEl =
      document.querySelector(".price-old__amount .price-variant__price") ||
      document.querySelector(".price-old__amount .money-amount__main") ||
      document.querySelector(".money-amount__old");

    const priceNodes = Array.from(
      document.querySelectorAll(
        ".price-old__amount .price-variant__price, .price-current__amount .price-variant__price, .money-amount__main, .price__amount, .money-amount__old"
      )
    );
    const priceTexts = uniq(priceNodes.map((n) => clean(n.textContent)));

    // ✅ SIZES (matches your DevTools: ul.size-selector-sizes -> button[data-qa-action="size-in-stock"])
    const sizeButtons = Array.from(
      document.querySelectorAll(
        [
          'button[data-qa-action="size-in-stock"]',
          'ul[class*="size-selector-sizes"] button',
          'button[class*="size-selector-sizes"][class*="__button"]',
        ].join(",")
      )
    );

    const sizesRaw = uniq(
      sizeButtons
        .map((btn) => {
          const label =
            btn.getAttribute("aria-label") ||
            btn.querySelector('[data-qa-qualifier*="size"]')?.textContent ||
            btn.querySelector('[class*="__label"]')?.textContent ||
            btn.textContent ||
            "";
          return clean(label);
        })
        .filter(Boolean)
        .map((t) => t.replace(/\s+Few items left\s*$/i, "").trim())
        .filter(Boolean)
    );

    const colorEl =
      document.querySelector(
        ".product-detail-color-selector__selected-color-name"
      ) || document.querySelector(".product-detail-info__color");
    let color = clean(colorEl?.textContent);
    if (color && color.includes("|")) color = clean(color.split("|")[0]);

    const ldJsonImages = [];
    Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).forEach((s) => {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        items.forEach((it) => {
          if (it?.image) {
            (Array.isArray(it.image) ? it.image : [it.image]).forEach((u) => {
              const abs = absolutize(u);
              if (abs) ldJsonImages.push(abs);
            });
          }
        });
      } catch {}
    });

    // ✅ YOUR REQUESTED UPDATE
    const sourceUrls = Array.from(
      document.querySelectorAll("picture.media-image source[srcset]")
    )
      .map((s) =>
        absolutize(pickBestFromSrcset(s.getAttribute("srcset") || ""))
      )
      .filter(Boolean);

    const imgUrls = Array.from(
      document.querySelectorAll("picture.media-image img")
    )
      .map((img) =>
        absolutize(
          pickBestFromSrcset(img.getAttribute("srcset") || "") ||
            img.getAttribute("src") ||
            ""
        )
      )
      .filter(Boolean);

    const images = uniq([ogImage, ...ldJsonImages, ...sourceUrls, ...imgUrls])
      .filter((u) => /^https?:\/\//i.test(u))
      .filter(isZaraAsset);

    const image = images[0] || (isZaraAsset(ogImage) ? ogImage : "") || "";

    return {
      title,
      currentPriceText: clean(currentPriceEl?.textContent),
      previousPriceText: clean(oldPriceEl?.textContent),
      priceTexts,
      image,
      images,
      sizesRaw,
      color,
      productUrl: location.href,
    };
  });

  const parsedAll = (raw.priceTexts || [])
    .map(parsePriceToNumber)
    .filter((n) => typeof n === "number" && Number.isFinite(n));

  const parsedCurrent = parsePriceToNumber(raw.currentPriceText);
  const price =
    typeof parsedCurrent === "number" && Number.isFinite(parsedCurrent)
      ? parsedCurrent
      : parsedAll.length
      ? Math.min(...parsedAll)
      : null;

  let originalPrice = parsePriceToNumber(raw.previousPriceText);
  if (
    (typeof originalPrice !== "number" || !Number.isFinite(originalPrice)) &&
    parsedAll.length &&
    typeof price === "number" &&
    Number.isFinite(price)
  ) {
    const maxSeen = Math.max(...parsedAll);
    originalPrice = maxSeen > price ? maxSeen : null;
  }

  if (
    typeof originalPrice === "number" &&
    typeof price === "number" &&
    Number.isFinite(originalPrice) &&
    Number.isFinite(price) &&
    originalPrice <= price
  ) {
    originalPrice = null;
  }

  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];
  const image = raw.image || images[0] || "";

  return {
    ...raw,
    price,
    originalPrice,
    image,
    images: images.length ? images : image ? [image] : [],
    discountPercent: calcDiscountPercent({ price, originalPrice }),
  };
};

const runZaraCrawl = async ({
  startUrls = DEFAULT_START_URLS,
  maxRequestsPerCrawl = 100,
  maxProducts = 200,
  debug = true,
} = {}) => {
  const results = [];
  const now = new Date();

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl,
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 180,
    maxRequestRetries: 1,
    useSessionPool: true,
    persistCookiesPerSession: true,

    failedRequestHandler: async ({ request, error }) => {
      console.log(
        `❌ FAILED [${request.label}] ${request.url}: ${error.message}`
      );
    },

    async requestHandler({ page, request, enqueueLinks }) {
      await clickCookiesAndOverlays(page);

      if (request.label === "LIST") {
        if (debug)
          console.log(
            `\x1b[94m🔍 ZARA LIST: Fetching products from ${request.url}...\x1b[0m`
          );

        await autoScrollUntilStable(page);

        await enqueueLinks({
          selector: "a[href]",
          label: "DETAIL",
          transformRequestFunction: (req) => {
            const url = stripQueryHash(req.url);
            if (!isLikelyProductUrl(url)) return false;
            req.url = url;
            return req;
          },
        });
        return;
      }

      if (request.label === "DETAIL") {
        if (results.length >= maxProducts) return;

        await clickCookiesAndOverlays(page);

        // ✅ MUST click ADD to render size list on many PDPs
        await openSizeSelectorIfNeeded(page);

        const detail = await extractDetail({ page });

        if (
          !detail.title ||
          typeof detail.price !== "number" ||
          !detail.image
        ) {
          if (debug)
            console.log(
              `\x1b[31m❌ ZARA SKIP: Missing Data @ ${request.url}\x1b[0m`
            );
          return;
        }

        const sizes = Array.from(
          new Set((detail.sizesRaw || []).map(normalizeSize).filter(Boolean))
        );

        const saleUrl =
          request.userData?.saleUrl || startUrls[0] || detail.productUrl;

        const gender = (detail.productUrl + saleUrl)
          .toLowerCase()
          .includes("woman")
          ? "women"
          : "men";

        const product = {
          canonicalKey: makeCanonicalKey({
            store: STORE,
            productUrl: detail.productUrl,
          }),
          store: STORE,
          storeName: STORE_NAME,
          title: detail.title,
          price: detail.price,
          currency: CURRENCY,
          originalPrice: detail.originalPrice,
          discountPercent: detail.discountPercent,
          image: detail.image,
          images:
            Array.isArray(detail.images) && detail.images.length
              ? detail.images
              : [detail.image],
          productUrl: detail.productUrl,
          saleUrl,
          category: deriveCategory({
            title: detail.title,
            productUrl: detail.productUrl,
          }),
          gender,
          colors: detail.color ? [detail.color] : [],
          sizesRaw: detail.sizesRaw || [],
          sizes,
          inStock: sizes.length > 0,
          status: "active",
          lastSeenAt: now,
        };

        results.push(product);

        if (debug) {
          const disc = product.originalPrice
            ? `\x1b[31m-${product.discountPercent}%\x1b[0m (Was: £${product.originalPrice})`
            : "\x1b[32mFULL PRICE\x1b[0m";

          console.log(
            `\x1b[36m┌─── ZARA PRODUCT [${results.length}/${maxProducts}]\x1b[0m`
          );
          console.log(
            `\x1b[36m│\x1b[0m \x1b[1mTitle:\x1b[0m      ${product.title.substring(
              0,
              55
            )}`
          );
          console.log(
            `\x1b[36m│\x1b[0m \x1b[1mPrice:\x1b[0m      \x1b[33m£${product.price}\x1b[0m ➔ ${disc}`
          );
          console.log(
            `\x1b[36m│\x1b[0m \x1b[1mSizes:\x1b[0m      [ ${
              product.sizes.length
                ? product.sizes.join(", ")
                : "\x1b[31mNONE\x1b[0m"
            } ]`
          );
          console.log(
            `\x1b[36m│\x1b[0m \x1b[1mColor:\x1b[0m      ${
              product.colors[0] || "N/A"
            }`
          );
          console.log(
            `\x1b[36m│\x1b[0m \x1b[1mImage:\x1b[0m      \x1b[90m${product.image}\x1b[0m`
          );
          console.log(
            `\x1b[36m│\x1b[0m \x1b[1mImagesCount:\x1b[0m ${product.images.length}`
          );
          console.log(
            `\x1b[36m│\x1b[0m \x1b[1mProductUrl:\x1b[0m \x1b[90m${product.productUrl}\x1b[0m`
          );
          console.log(
            `\x1b[36m└─────────────────────────────────────────────────\x1b[0m\n`
          );
        }
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

module.exports = { runZaraCrawl };
