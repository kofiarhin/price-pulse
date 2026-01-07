const { PlaywrightCrawler } = require("crawlee");
const sendEmail = require("./server/services/sendEmail");

const crawler = new PlaywrightCrawler({
  launchContext: {
    launchOptions: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  },
  requestHandler: async ({ page, request, log }) => {
    await page.waitForLoadState("domcontentloaded");

    const title = await page
      .locator("h1")
      .first()
      .innerText()
      .catch(() => null);

    const priceEl = page.locator('.product-price [itemprop="price"]').first();
    await priceEl.waitFor({ timeout: 60000 });

    const priceRaw =
      (await priceEl.getAttribute("content")) ||
      (await priceEl.innerText().catch(() => null));

    const currency = await page
      .locator('.product-price meta[itemprop="priceCurrency"]')
      .getAttribute("content")
      .catch(() => null);

    const price = priceRaw
      ? Number(String(priceRaw).replace(/[^\d.]/g, ""))
      : null;

    await page.waitForSelector("ul.swatches.size", { timeout: 60000 });

    const sizes = await page.$$eval("ul.swatches.size li", (lis) => {
      return lis
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

          return size
            ? { size, inStock: !isUnavailable, title: titleAttr || null }
            : null;
        })
        .filter(Boolean);
    });

    const large = sizes.find((s) => {
      const v = String(s.size || "")
        .trim()
        .toUpperCase();
      return v === "L" || v === "LARGE";
    });

    log.info(
      JSON.stringify(
        { url: request.url, title, price, currency, sizes },
        null,
        2
      )
    );

    if (large?.inStock) {
      console.log("item in stock");
      await sendEmail({
        subject: `IN STOCK (L): ${title}`,
        text: `Large is in stock.\n\n${title}\nPrice: ${currency || ""} ${price ?? ""
          }\n${request.url}`,
        html: `
          <h2>Large is in stock</h2>
          <p><strong>${title}</strong></p>
          <p>Price: <strong>${currency || ""} ${price ?? ""}</strong></p>
          <p><a href="${request.url}">Open product</a></p>
        `,
      });

      log.info("✅ Email sent (L in stock).");
      process.exit(0);
    } else {
      console.log("large not in stock will check later");
    }

    log.info("❌ L not in stock. No email sent.");
    process.exit(0);
  },
});

crawler.run([
  {
    url: "https://www.boohooman.com/training-dept-oversized-boxy-hoodie/CMM18756.html?color=135",
    label: "PRODUCT",
  },
]);
