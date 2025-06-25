const app = require("../app");
const dotenv = require("dotenv").config();
const request = require("supertest");
const sendEmail = require("../utility/sendEmail");
const { generateEmailOptions } = require("../utility/emailServices");
const { getProductInfo } = require("../utility/helper");
const { testUrl } = require("./data");

describe("services", () => {
  it(" it should just pass", async () => {
    expect(1).toBe(1);
  });

  it("should send email properly", async () => {
    const emailOptions = {
      to: "davidkraku69@gmail.com",
      subject: "testing mic",
      text: "this is a test",
    };

    // const { messageId } = await sendEmail(emailOptions);
    // expect(messageId).toBeTruthy();
  });
  it("should generate email options properly", async () => {
    const options = {
      email: "davidkraku69@gmail.com",
      name: "test",
      price: 20,
      url: "some url",
    };

    const emailOptions = generateEmailOptions(options);
    const properties = ["to", "subject", "text"];
    properties.forEach((p) => {
      expect(emailOptions).toHaveProperty(p);
    });
  });

  it("should generate product info properly", async () => {
    const productInfo = await getProductInfo(testUrl);
  });
});
