const sendEmail = require("../utility/sendEmail");
const { generateEmailOptions } = require("../utility/emailServices");
const { getProductInfo } = require("../utility/helper");

const checkPrice = async (req, res) => {
  try {
    const { name, email, productUrl: url } = req.body;

    const result = await getProductInfo(url);
    const emailOptions = generateEmailOptions({
      email,
      name: result?.name,
      url: result?.imageUrl,
    });
    // console.log(emailOptions);
    // await sendEmail(emailOptions);
    console.log("email sent");
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
