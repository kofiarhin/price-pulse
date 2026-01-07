// boohooman.search.full.crawler.js
// npm i crawlee playwright
// KEYWORD=joggers MAX_ITEMS=25 MAX_PAGES=1 DEBUG=0 node boohooman.search.full.crawler.js

const { PlaywrightCrawler, RequestQueue, log } = require("crawlee");
const fs = require("fs");
const path = require("path");

const KEYWORD = process.env.KEYWORD || "joggers";
const MAX_ITEMS = Number(process.env.MAX_ITEMS || 25);
const MAX_PAGES = Number(process.env.MAX_PAGES || 1);
const MAX_SCROLLS = Number(process.env.MAX_SCROLLS || 8);
const DEBUG = String(process.env.DEBUG || "0") === "1";
const HEADLESS = String(process.env.HEADLESS || "1") !== "0";

const START_URL = `https://www.boohooman.com/search?q=${encodeURIComponent(
  KEYWORD
)}`;

// ✅ outputs
const OUT_DIR = process.cwd(); // writes to project root
const OUT_FILE = path.join(OUT_DIR, "products.json"); // ✅ EXACT filename
const NDJSON_FILE = path.join(OUT_DIR, "products.ndjson"); // temp

// ---- file writer (NDJSON while crawling -> final JSON array on finish) ----
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const writeLine = (line) => {
  fs.appendFileSync(NDJSON_FILE, line + "\n", "utf8");
};

const buildJsonArrayFromNdjson = () => {
  if (!fs.existsSync(NDJSON_FILE)) return [];
  const raw = fs.readFileSync(NDJSON_FILE, "utf8").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

// ---- utils ----
const uniq = (arr) => [...new Set((arr || []).filter(Boolean))];

const absUrl = (maybeUrl, base) => {
  try {
    if (!maybeUrl) return null;
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
};

const safeJsonParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const cleanText = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();

// ✅ NEW: helpers to avoid junk + placeholders
const isRealImageUrl = (url) => {
  if (!url) return false;
  const u = String(url).trim();
  if (!u) return false;
  if (u.startsWith("data:")) return false;
  const low = u.toLowerCase();
  if (low.includes("data:image/gif")) return false;
  if (u.includes("R0lGODlhAQABA")) return false; // 1x1 gif marker
  return true;
};

const sanitizeText = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();

const isJunkDescription = (s) => {
  const text = String(s || "").toLowerCase();
  if (!text) return false;

  const needles = [
    "function()",
    "cquotient",
    "datacloud",
    "dw.ac._capture",
    "/cqrecomm-start",
    "recommendations-pdp",
    "recently viewed items",
    "we think you'll like",
  ];

  return needles.some((n) => text.includes(n.toLowerCase()));
};

const closePopups = async (page) => {
  const candidates = [
    "#onetrust-accept-btn-handler",
    'button:has-text("Accept")',
    'button:has-text("Agree")',
    'button[aria-label*="close" i]',
    'button:has-text("Close")',
  ];
  for (const sel of candidates) {
    await page
      .locator(sel)
      .first()
      .click({ timeout: 1200 })
      .catch(() => {});
  }
};

const autoScrollResults = async (page, maxScrolls = 8) => {
  let lastCount = 0;

  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);

    const count = await page
      .locator("#search-result-items .product-tile")
      .count();
    if (count === lastCount) break;
    lastCount = count;
  }
};

const parseJsonLdProduct = async (page) => {
  const raw = await page
    .$$eval('script[type="application/ld+json"]', (scripts) =>
      scripts.map((s) => s.textContent || "").filter(Boolean)
    )
    .catch(() => []);

  const nodes = [];
  for (const s of raw) {
    const parsed = safeJsonParse(s);
    if (!parsed) continue;

    if (Array.isArray(parsed)) nodes.push(...parsed);
    else nodes.push(parsed);

    if (parsed && parsed["@graph"] && Array.isArray(parsed["@graph"])) {
      nodes.push(...parsed["@graph"]);
    }
  }

  const product =
    nodes.find((n) => String(n?.["@type"] || "").toLowerCase() === "product") ||
    nodes.find((n) => {
      const t = n?.["@type"];
      if (Array.isArray(t))
        return t.map(String).some((x) => x.toLowerCase() === "product");
      return false;
    });

  return product || null;
};

const extractListingTiles = async (page) => {
  const tiles = await page
    .$$eval("#search-result-items .product-tile", (els) =>
      els
        .map((el) => {
          const a = el.querySelector('a[href*=".html"]');
          const url = a?.href || null;

          const raw = el.getAttribute("data-product-tile");
          const itemId = el.getAttribute("data-itemid") || null;
          const title = el.getAttribute("data-product-title") || null;

          return { url, raw, itemId, title };
        })
        .filter((t) => t.url)
    )
    .catch(() => []);

  return tiles.map((t) => {
    const tileData = safeJsonParse(t.raw) || null;
    return {
      url: t.url,
      itemId: t.itemId,
      title: t.title,
      tileData,
    };
  });
};

const extractBreadcrumbs = async (page) => {
  const crumbs = await page
    .$$eval(
      'nav.breadcrumb a, nav.breadcrumbs a, .breadcrumb a, .breadcrumbs a, [aria-label="Breadcrumb"] a',
      (as) => as.map((a) => (a.textContent || "").trim()).filter(Boolean)
    )
    .catch(() => []);

  return uniq(crumbs);
};

const extractImages = async (page, requestUrl, schemaProduct) => {
  const fromSchema = [];
  const schemaImages = schemaProduct?.image;

  if (typeof schemaImages === "string") fromSchema.push(schemaImages);
  if (Array.isArray(schemaImages)) fromSchema.push(...schemaImages);

  const og = await page
    .locator('meta[property="og:image"], meta[name="og:image"]')
    .first()
    .getAttribute("content")
    .catch(() => null);

  const fromDom = await page
    .$$eval(
      ".product-image-container img, .product-col-1 img, [data-cmp*='productImage'] img, picture img",
      (imgs) =>
        imgs
          .map((img) => {
            const src =
              img.currentSrc ||
              img.src ||
              img.getAttribute("data-src") ||
              img.getAttribute("data-original") ||
              img.getAttribute("data-zoom-image") ||
              img.getAttribute("data-large-image") ||
              null;

            const srcset = img.getAttribute("srcset") || "";
            const bestFromSrcset =
              srcset
                .split(",")
                .map((p) => p.trim().split(" ")[0])
                .filter(Boolean)
                .pop() || null;

            return bestFromSrcset || src;
          })
          .filter(Boolean)
    )
    .catch(() => []);

  const all = uniq([
    ...fromSchema.map((u) => absUrl(u, requestUrl)),
    absUrl(og, requestUrl),
    ...fromDom.map((u) => absUrl(u, requestUrl)),
  ]).filter(Boolean);

  const before = all.length;

  const filtered = all.filter(isRealImageUrl);
  const after = filtered.length;

  const alt = await page
    .locator(".product-image-container img")
    .first()
    .getAttribute("alt")
    .catch(() => null);

  return {
    primaryImage: filtered[0] || null,
    images: filtered.map((url) => ({ url, alt: alt || null })),
    filteredImageCount: { before, after },
  };
};

const extractSizes = async (page) => {
  await page
    .waitForSelector("ul.swatches.size", { timeout: 30000 })
    .catch(() => {});

  const sizes = await page
    .$$eval("ul.swatches.size li", (lis) =>
      lis
        .map((li) => {
          const anchor =
            li.querySelector(".swatchanchor") ||
            li.querySelector("a, button, span");

          const size = (anchor?.textContent || li.textContent || "").trim();
          const titleAttr =
            anchor?.getAttribute("title") || li.getAttribute("title") || "";

          const cls = li.className || "";
          const isUnavailable =
            /not available/i.test(titleAttr) ||
            /unselectable|disabled|unavailable|outofstock/i.test(cls);

          const isSelected = /selected|active/i.test(cls);

          return size
            ? {
                size,
                inStock: !isUnavailable,
                selected: !!isSelected,
                hint: titleAttr || null,
              }
            : null;
        })
        .filter(Boolean)
    )
    .catch(() => []);

  return sizes;
};

const extractColors = async (page, requestUrl) => {
  const colors = await page
    .$$eval("ul.swatches.colour li, ul.swatches.color li", (lis) =>
      lis
        .map((li) => {
          const a = li.querySelector("a");
          const title =
            a?.getAttribute("title") || li.getAttribute("title") || "";
          const name = (title || a?.textContent || li.textContent || "").trim();
          const href = a?.href || a?.getAttribute("href") || null;
          const cls = li.className || "";
          const selected = /selected|active/i.test(cls);

          return name ? { name, selected, url: href || null } : null;
        })
        .filter(Boolean)
    )
    .catch(() => []);

  return colors.map((c) => ({ ...c, url: absUrl(c.url, requestUrl) }));
};

const extractDescriptionAndDetails = async (page) => {
  const selector =
    '[itemprop="description"], .product-description, .pdp-description, .product-detail-content';

  const blocks = await page
    .$$eval(selector, (els) =>
      els
        .map((el) => {
          const clone = el.cloneNode(true);
          clone
            .querySelectorAll("script, style, noscript, iframe")
            .forEach((n) => n.remove());
          const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
          return text || null;
        })
        .filter(Boolean)
    )
    .catch(() => []);

  if (!blocks.length) return null;

  const longest = blocks.reduce(
    (best, cur) => ((cur || "").length > (best || "").length ? cur : best),
    ""
  );

  const cleaned = sanitizeText(longest);
  if (!cleaned) return null;
  if (isJunkDescription(cleaned)) return null;

  return cleaned;
};

const extractProductCode = async (page) => {
  const maybe = await page
    .locator(":text-matches('Product code', 'i')")
    .first()
    .innerText()
    .catch(() => null);

  const s = cleanText(maybe);
  const m = s.match(/Product code:\s*([A-Z0-9_-]+)/i);
  return m?.[1] || null;
};

const extractRating = async (page) => {
  const ratingValue =
    (await page
      .locator('[itemprop="ratingValue"]')
      .first()
      .getAttribute("content")
      .catch(() => null)) ||
    (await page
      .locator('[itemprop="ratingValue"]')
      .first()
      .innerText()
      .catch(() => null));

  const reviewCount =
    (await page
      .locator('[itemprop="reviewCount"]')
      .first()
      .getAttribute("content")
      .catch(() => null)) ||
    (await page
      .locator('[itemprop="reviewCount"]')
      .first()
      .innerText()
      .catch(() => null));

  const value = ratingValue
    ? Number(String(ratingValue).replace(/[^\d.]/g, ""))
    : null;
  const count = reviewCount
    ? Number(String(reviewCount).replace(/[^\d]/g, ""))
    : null;

  return value || count ? { value: value ?? null, count: count ?? null } : null;
};

const extractOffersFromSchema = (schemaProduct) => {
  const offers = schemaProduct?.offers;
  if (!offers) return null;

  const o = Array.isArray(offers) ? offers[0] : offers;
  const price =
    o?.price != null ? Number(String(o.price).replace(/[^\d.]/g, "")) : null;
  const currency = o?.priceCurrency || null;

  const availabilityRaw = o?.availability || null;
  const availability =
    typeof availabilityRaw === "string"
      ? availabilityRaw.split("/").pop()
      : null;

  return { price, currency, availability };
};

const main = async () => {
  // OUT_DIR is cwd; ensure exists (no-op)
  ensureDir(OUT_DIR);

  // reset files each run
  if (fs.existsSync(NDJSON_FILE)) fs.unlinkSync(NDJSON_FILE);
  if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE);

  const requestQueue = await RequestQueue.open();

  await requestQueue.addRequest({
    url: START_URL,
    label: "SEARCH",
    userData: { keyword: KEYWORD, pageNum: 1 },
  });

  let emitted = 0;

  const crawler = new PlaywrightCrawler({
    requestQueue,
    maxConcurrency: 2,
    requestHandlerTimeoutSecs: 120,

    launchContext: {
      launchOptions: {
        headless: HEADLESS,
      },
    },

    preNavigationHooks: [
      async ({ page }) => {
        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (["image", "media", "font"].includes(type)) return route.abort();
          return route.continue();
        });
      },
    ],

    requestHandler: async ({ page, request }) => {
      await page.waitForLoadState("domcontentloaded");
      await closePopups(page);

      if (request.label === "SEARCH") {
        await page.waitForSelector("#search-result-items .product-tile", {
          timeout: 60000,
        });
        await autoScrollResults(page, MAX_SCROLLS);

        const tiles = await extractListingTiles(page);

        for (const t of tiles) {
          if (emitted >= MAX_ITEMS) break;

          await requestQueue.addRequest(
            {
              url: t.url,
              label: "PRODUCT",
              uniqueKey: t.url,
              userData: {
                keyword: request.userData.keyword,
                tile: t.tileData || null,
              },
            },
            { forefront: false }
          );

          emitted++;
        }

        if ((request.userData.pageNum || 1) < MAX_PAGES) {
          const nextHref =
            (await page
              .locator('a[rel="next"]')
              .first()
              .getAttribute("href")
              .catch(() => null)) ||
            (await page
              .locator(".pagination .next a")
              .first()
              .getAttribute("href")
              .catch(() => null));

          const nextUrl = absUrl(nextHref, request.url);
          if (nextUrl) {
            await requestQueue.addRequest({
              url: nextUrl,
              label: "SEARCH",
              userData: {
                keyword: request.userData.keyword,
                pageNum: (request.userData.pageNum || 1) + 1,
              },
            });
          }
        }

        log.info(
          `SEARCH "${request.userData.keyword}" queued up to ${MAX_ITEMS} products`
        );
        return;
      }

      if (request.label === "PRODUCT") {
        const schemaProduct = await parseJsonLdProduct(page);

        const title =
          (await page
            .locator("h1.product-name, h1.js-product-name, h1")
            .first()
            .innerText()
            .catch(() => null)) || null;

        const productCode = await extractProductCode(page);

        const brand =
          schemaProduct?.brand?.name ||
          (await page
            .locator('[itemprop="brand"]')
            .first()
            .innerText()
            .catch(() => null)) ||
          null;

        const schemaOffers = extractOffersFromSchema(schemaProduct);

        const priceEl = page
          .locator('.product-price [itemprop="price"]')
          .first();
        await priceEl.waitFor({ timeout: 30000 }).catch(() => {});

        const priceRaw =
          (await priceEl.getAttribute("content").catch(() => null)) ||
          (await priceEl.innerText().catch(() => null));

        const domCurrency =
          (await page
            .locator('.product-price meta[itemprop="priceCurrency"]')
            .first()
            .getAttribute("content")
            .catch(() => null)) || null;

        const domPrice = priceRaw
          ? Number(String(priceRaw).replace(/[^\d.]/g, ""))
          : null;

        const breadcrumbs = await extractBreadcrumbs(page);
        const colors = await extractColors(page, request.url);
        const sizes = await extractSizes(page);

        const { primaryImage, images, filteredImageCount } =
          await extractImages(page, request.url, schemaProduct);

        const schemaDescRaw = schemaProduct?.description || null;
        const schemaDesc = schemaDescRaw ? sanitizeText(schemaDescRaw) : null;
        const schemaDescWasJunk = schemaDesc
          ? isJunkDescription(schemaDesc)
          : false;
        const schemaDescSafe =
          schemaDesc && !schemaDescWasJunk ? schemaDesc : null;

        const domDesc = await extractDescriptionAndDetails(page);
        const description = schemaDescSafe || domDesc || null;

        const descSource = schemaDescSafe ? "schema" : domDesc ? "dom" : "none";
        const descLength = description ? String(description).length : 0;

        const rating = await extractRating(page);

        const availability =
          schemaOffers?.availability ||
          (schemaProduct?.offers?.availability
            ? String(schemaProduct.offers.availability).split("/").pop()
            : null);

        const tile = request.userData.tile || null;

        const out = {
          source: "boohooman",
          keyword: request.userData.keyword || KEYWORD,
          scrapedAt: new Date().toISOString(),

          url: request.url,
          id: tile?.id || schemaProduct?.sku || productCode || null,
          sku: schemaProduct?.sku || productCode || tile?.id || null,

          title: cleanText(title),
          brand: cleanText(brand),
          breadcrumbs,

          pricing: {
            currency:
              schemaOffers?.currency ||
              domCurrency ||
              tile?.price?.currency ||
              null,
            current:
              schemaOffers?.price ??
              domPrice ??
              (tile?.price?.value != null ? Number(tile.price.value) : null),
            list:
              tile?.list?.value != null
                ? Number(tile.list.value)
                : tile?.listPrice?.value != null
                ? Number(tile.listPrice.value)
                : null,
            sale:
              tile?.sale?.value != null
                ? Number(tile.sale.value)
                : tile?.salePrice?.value != null
                ? Number(tile.salePrice.value)
                : null,
            discount:
              tile?.discount != null
                ? Number(tile.discount)
                : tile?.discountPrice != null
                ? Number(tile.discountPrice)
                : null,
            formatted:
              tile?.price?.formatted || tile?.price?.formattedValue || null,
          },

          availability:
            availability ||
            (tile?.inStock === true
              ? "InStock"
              : tile?.inStock === false
              ? "OutOfStock"
              : null),

          media: {
            primaryImage,
            images,
          },

          variants: {
            colors,
            sizes,
          },

          description,
          rating,

          ...(DEBUG
            ? {
                debug: {
                  descSource,
                  descLength,
                  schemaDescWasJunk,
                  filteredImageCount,
                  tile,
                  schemaProduct,
                },
              }
            : {}),
        };

        writeLine(JSON.stringify(out));
        console.log(JSON.stringify(out, null, 2));
        return;
      }
    },

    failedRequestHandler: async ({ request, error }) => {
      log.error(`FAILED: ${request.url}`);
      log.error(error?.message || String(error));
    },
  });

  await crawler.run();

  const products = buildJsonArrayFromNdjson();
  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2), "utf8");

  // cleanup temp file
  if (fs.existsSync(NDJSON_FILE)) fs.unlinkSync(NDJSON_FILE);

  log.info(`✅ Saved ${products.length} products -> ${OUT_FILE}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
