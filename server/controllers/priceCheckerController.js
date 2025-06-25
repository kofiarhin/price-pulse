const sendEmail = require("../utility/sendEmail");
const { generateEmailOptions } = require("../utility/emailServices");
const { getProductInfo } = require("../utility/helper");

const checkPrice = async (req, res) => {
  try {
    const { url, email } = req.body;
    const result = await getProductInfo(url);
    return res.json(result);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ error: error.message });
  }
};
module.exports = {
  checkPrice,
};
