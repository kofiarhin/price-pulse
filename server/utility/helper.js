const puppeteer = require("puppeteer");

// Scrape all product data
const getProductInfo = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const html = await page.content();

    let price = null;
    let inStock = null;
    let name = null;
    let stockCount = null;
    let imageUrl = null;
    let description = null;

    // Try embedded JSON
    const jsonMatch = html.match(
      /<script[^>]*>window\.__INITIAL_STATE__\s*=\s*(\{.+?\})<\/script>/
    );

    if (jsonMatch && jsonMatch[1]) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const product = data?.product?.currentProduct || data?.product;

        price = product?.price?.salePrice || product?.price || null;
        inStock =
          product?.stockStatus === "IN_STOCK" ||
          product?.inventory > 0 ||
          false;
        name = product?.name || null;
        stockCount =
          typeof product?.inventory === "number" ? product.inventory : null;
        imageUrl =
          product?.image ||
          product?.imageUrl ||
          product?.images?.[0]?.url ||
          null;
        description = product?.description || null;
      } catch (err) {
        console.warn("Failed to parse embedded JSON:", err.message);
      }
    }

    // Regex + DOM fallbacks
    if (!price) {
      const priceMatch = html.match(/£\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);
      price = priceMatch
        ? parseFloat(priceMatch[0].replace(/[^0-9.]/g, ""))
        : null;
    }

    if (inStock === null) {
      const stockMatch = html.match(
        /(in stock|out of stock|available|unavailable|sold out|pre-order)/i
      );
      if (stockMatch) {
        const status = stockMatch[0].toLowerCase();
        inStock =
          status.includes("in stock") ||
          status.includes("available") ||
          status.includes("pre-order");
      }
    }

    if (stockCount === null) {
      const countMatch = html.match(
        /(\d+)\s+(left in stock|items? available)/i
      );
      if (countMatch) {
        stockCount = parseInt(countMatch[1], 10);
      }
    }

    const meta = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || null;
      };

      const getImage = () => {
        const selectors = [
          "img.product-image",
          "img[data-src]",
          'img[src*="product"]',
          ".product-gallery img",
          ".swiper-slide img",
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.src) return el.src;
          if (el?.getAttribute("data-src")) return el.getAttribute("data-src");
        }
        return (
          document.querySelector('meta[property="og:image"]')?.content || null
        );
      };

      return {
        name:
          document.querySelector('meta[property="og:title"]')?.content ||
          document.title ||
          null,
        imageUrl: getImage(),
        description:
          document.querySelector('meta[name="description"]')?.content ||
          getText(".product-description") ||
          getText("#description") ||
          getText(".desc") ||
          null,
      };
    });

    name ||= meta.name;
    imageUrl ||= meta.imageUrl;
    description ||= meta.description;

    return { price, inStock, name, stockCount, imageUrl, description };
  } catch (err) {
    console.error(`getPrice error for URL: ${url} → ${err.message}`);
    return {
      price: null,
      inStock: null,
      name: null,
      stockCount: null,
      imageUrl: null,
      description: null,
    };
  } finally {
    await browser.close();
  }
};

// --------------------------------------------
// Email generators (no changes below this line)
// --------------------------------------------

module.exports = {
  getProductInfo,
};
