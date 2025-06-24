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

  const match = html.match(/£\s?\d+(?:\.\d{2})?/);

  if (match) {
    const price = match[0].trim();
    const numeric = parseFloat(price.replace(/[^0-9.]/g, ""));

    return numeric;
  }
  await browser.close();
};

const generateEmailOptions = ({ email, name = "the item" }) => {
  const subject = `Update on ${name} You’re Watching`;

  const text = `
Hello,

We’ve just checked the product you're monitoring: ${name}.

We’ll continue tracking it and notify you of any significant updates.

Thanks for using PricePulse.

– The PricePulse Team
`;

  const html = `
<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333;">
  <h2 style="color: #2b2b2b;">Update on ${name}</h2>
  <p>Hello,</p>
  <p>We’ve just checked the product you're monitoring: <strong>${name}</strong>.</p>
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

const generatePriceChangeEmailOptions = ({
  email,
  name = "the item",
  oldPrice,
  newPrice,
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

We’ll keep tracking this item and notify you of further changes.

– The PricePulse Team
`;

  const html = `
<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333;">
  <h2 style="color: #2b2b2b;">Price Alert: ${name}</h2>
  <p>Hello,</p>
  <p>We've detected a price change for <strong>${name}</strong>.</p>
  <p style="font-size: 16px;"><strong>${changeText}</strong></p>
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
