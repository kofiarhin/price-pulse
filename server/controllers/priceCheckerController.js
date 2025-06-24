const sendEmail = require("../utility/sendEmail");
const { getPrice, generateEmailOptions } = require("../utility/helper");

const checkPrice = async (req, res) => {
  try {
    const { name, email, productUrl: url } = req.body;

    const result = await getPrice(url);
    const emailOptions = generateEmailOptions({ email, price: result.price });
    await sendEmail(emailOptions);
    return res.json({ ...result });

    return res.json({
      message: `email sent successfully to ${email}`,
      currentPrice: price,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  checkPrice,
};
