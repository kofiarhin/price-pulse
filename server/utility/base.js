const puppeteer = require("puppeteer");

// Scrape product data: price, stock, name, stockCount, imageUrl
const getPrice = async (url) => {
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

    // Embedded JSON
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
      } catch (err) {
        console.warn("Failed to parse embedded JSON:", err.message);
      }
    }

    // Fallbacks
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

    // Accurate DOM-based image and name fallback
    if (!name || !imageUrl) {
      const meta = await page.evaluate(() => {
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
            if (el?.getAttribute("data-src"))
              return el.getAttribute("data-src");
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
        };
      });

      name ||= meta.name;
      imageUrl ||= meta.imageUrl;
    }

    return { price, inStock, name, stockCount, imageUrl };
  } catch (err) {
    console.error(`getPrice error for URL: ${url} → ${err.message}`);
    return {
      price: null,
      inStock: null,
      name: null,
      stockCount: null,
      imageUrl: null,
    };
  } finally {
    await browser.close();
  }
};

// Email: general update
const generateEmailOptions = ({
  email,
  name = "the item",
  price,
  url = null,
}) => {
  const subject = `Update on ${name} – Current Price: £${price}`;

  const text = `
Hello,

We’ve just checked the product you're monitoring: ${name}.
Current Price: £${price}
${url ? `Product link: ${url}` : ""}

We’ll continue tracking it and notify you of any significant updates.

Thanks for using PricePulse.
– The PricePulse Team
`;

  const html = `
<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333;">
  <h2 style="color: #2b2b2b;">Update on ${name}</h2>
  <p>Hello,</p>
  <p>We’ve just checked the product you're monitoring: <strong>${name}</strong>.</p>
  <p><strong>Current Price:</strong> £${price}</p>
  ${url ? `<p><a href="${url}" target="_blank">View Product</a></p>` : ""}
  <p>We’ll continue tracking it and notify you of any significant updates.</p>
  <p style="margin-top: 30px;">Thanks for using PricePulse,<br/>The PricePulse Team</p>
</div>
`;

  return {
    from: '"PricePulse Notifications" <no-reply@pricepulse.com>',
    to: email,
    subject,
    text,
    html,
  };
};

// Email: price change alert
const generatePriceChangeEmailOptions = ({
  email,
  name = "the item",
  oldPrice,
  newPrice,
  url = null,
}) => {
  const subject = `Price Change Detected: ${name}`;
  const priceDiff = newPrice - oldPrice;
  const changeType = priceDiff < 0 ? "dropped" : "increased";
  const changeText = `The price has ${changeType} from £${oldPrice.toFixed(
    2
  )} to £${newPrice.toFixed(2)}.`;

  const text = `
Hello,

We’ve detected a price change for the product you're monitoring: ${name}.
${changeText}
${url ? `Product link: ${url}` : ""}

We’ll keep tracking this item and notify you of further changes.

– The PricePulse Team
`;

  const html = `
<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333;">
  <h2 style="color: #2b2b2b;">Price Alert: ${name}</h2>
  <p>Hello,</p>
  <p>We've detected a price change for <strong>${name}</strong>.</p>
  <p style="font-size: 16px;"><strong>${changeText}</strong></p>
  ${url ? `<p><a href="${url}" target="_blank">View Product</a></p>` : ""}
  <p>We’ll keep tracking this item and notify you of further changes.</p>
  <p style="margin-top: 30px;">– The PricePulse Team</p>
</div>
`;

  return {
    from: '"PricePulse Notifications" <no-reply@pricepulse.com>',
    to: email,
    subject,
    text,
    html,
  };
};

module.exports = {
  getPrice,
  generateEmailOptions,
  generatePriceChangeEmailOptions,
};
