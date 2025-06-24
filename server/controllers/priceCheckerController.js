const sendEmail = require("../utility/sendEmail");
const { getPrice, generateEmailOptions } = require("../utility/fetchPrice");

const checkPrice = async (req, res) => {
  try {
    const { name, email, productUrl: url } = req.body;

    await sendEmail({ to: email, subject: "testing mic", text: "some text" });
    return res.json({ message: "message sent" });

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
