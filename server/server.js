const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");

const Product = require("./models/product.model");
const connectDB = require("./config/db");

const app = express();
const port = process.env.PORT || 5000;

// connect to database
connectDB();

// middlewares
app.use(cors());
app.use(express.json());

// health (liveness)
app.get("/", (req, res) => {
  res.json({ ok: true, service: "api", time: new Date().toISOString() });
});

// health (readiness + db)
app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  const ok = dbState === "connected";

  res.status(ok ? 200 : 503).json({
    ok,
    service: "api",
    db: dbState,
    uptime: Math.floor(process.uptime()),
    time: new Date().toISOString(),
  });
});

// GET /api/products?search=&store=&category=&gender=&minPrice=&maxPrice=&inStock=&status=&page=&limit=&sort=
app.get("/api/products", async (req, res) => {
  try {
    const {
      search,
      store,
      category,
      gender,
      minPrice,
      maxPrice,
      inStock,
      status,
      page = 1,
      limit = 50,
      sort = "newest", // newest | oldest | price-asc | price-desc | discount-desc
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (store) query.store = store;
    if (category) query.category = category;
    if (gender) query.gender = gender;

    if (inStock === "true") query.inStock = true;
    if (inStock === "false") query.inStock = false;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      const q = String(search).trim();
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { storeName: { $regex: q, $options: "i" } },
        { store: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { gender: { $regex: q, $options: "i" } },
        { colors: { $in: [new RegExp(q, "i")] } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    let sortObj = { createdAt: -1 };
    if (sort === "oldest") sortObj = { createdAt: 1 };
    if (sort === "price-asc") sortObj = { price: 1 };
    if (sort === "price-desc") sortObj = { price: -1 };
    if (sort === "discount-desc")
      sortObj = { discountPercent: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      Product.find(query).sort(sortObj).skip(skip).limit(limitNum),
      Product.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

// GET /api/products/:id
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: "invalid product id" });
  }
});

// POST /api/products
app.post("/api/products", async (req, res) => {
  try {
    const created = await Product.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Product already exists" });
    }
    res.status(400).json({ message: "something went wrong" });
  }
});

// PUT /api/products/:id
app.put("/api/products/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Product not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

// DELETE /api/products/:id
app.delete("/api/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true, deletedId: deleted._id });
  } catch (error) {
    res.status(400).json({ message: "something went wrong" });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(port, () => {
  console.log("server started on port: ", port);
});
