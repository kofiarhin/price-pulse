const { getPrice } = require("./utility/fetchPrice");
const runCron = require("./utility/runCron");

const url =
  "https://www.popmart.com/gb/products/1064/the-monsters-big-into-energy-series-vinyl-plush-pendant-blind-box";

const run = async () => {
  runCron(url);
};

run();
