const app = require("../app");
const request = require("supertest");
const sendEmail = require("../utility/sendEmail");

describe("services", () => {
  const url =
    "https://www.popmart.com/gb/products/1064/the-monsters-big-into-energy-series-vinyl-plush-pendant-blind-box";

  it(" it should just pass", async () => {
    expect(1).toBe(1);
  });
});
