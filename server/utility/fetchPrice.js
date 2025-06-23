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

const generateEmailOptions = ({ email, price, productName = "the item" }) => {
  const subject = `Price Update: Latest Price for ${productName}`;

  const text = `
Hello,

We’ve just checked the product you’re monitoring: ${productName}.

Current Price: ${price}

We’ll continue to monitor this item and notify you of any significant changes.

Thank you for choosing PricePulse.

Best regards,  
The PricePulse Team
`;

  const html = `
<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333;">
  <h2 style="color: #2b2b2b;">Price Update for ${productName}</h2>
  <p>Hello,</p>
  <p>We’ve just checked the product you’re monitoring.</p>
  <p style="font-size: 16px;"><strong>Current Price:</strong> ${price}</p>
  <p>We’ll continue to monitor this item and notify you of any significant changes.</p>
  <p style="margin-top: 30px;">Thank you for choosing PricePulse,<br/>The PricePulse Team</p>
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
};
