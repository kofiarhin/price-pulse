const cron = require("node-cron");
const { getPrice } = require("./fetchPrice");

const runCron = (url) => {
  cron.schedule("* * * * *", async () => {
    console.log("fetching price");
    const price = await getPrice(url);
    console.log("current price is ", price);
    console.log("send email to kofiarhin@gmmail.com");
  });
};

module.exports = runCron;
