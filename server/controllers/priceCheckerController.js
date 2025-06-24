const sendEmail = require("../utility/sendEmail");
const { getPrice, generateEmailOptions } = require("../utility/fetchPrice");

const checkPrice = async (req, res) => {
  return res.json({ message: "testing mic one two" });
  try {
    const { url, email } = req.body;

    const price = await getPrice(url);
    const emailOptions = generateEmailOptions({ email, price });
    const result = await sendEmail(emailOptions);
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
