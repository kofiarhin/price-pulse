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
  generatePriceChangeEmailOptions,
  generateEmailOptions,
};
