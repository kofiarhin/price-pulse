const puppeteer = require("puppeteer");
const fs = require("fs/promises");

// get price
const getPrice = async (url) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
  );

  await page.goto(url, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const html = await page.content();

  //   const rawPrice = await page.$eval(".index_price__cAj0h", (el) =>
  //     el.innerText.trim()
  //   );

  const match = html.match(/£\s?\d+(?:\.\d{2})?/);

  if (match) {
    const price = match[0].trim();
    const numeric = parseFloat(price.replace(/[^0-9.]/g, ""));

    return numeric;
  }
  await browser.close();
};

module.exports = {
  getPrice,
};
