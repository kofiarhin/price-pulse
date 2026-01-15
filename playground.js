const dotenv = require("dotenv").config();
const Product = require("./server/models/product.model");
const mongoose = require("mongoose");
const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("connected to database");
    const products = await Product.find();

    console.log(products[0]);
  } catch (error) {
    process.exit(1);
  }
};

run();
