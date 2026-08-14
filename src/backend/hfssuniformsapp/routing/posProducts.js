import express from "express";
import mongoose from "mongoose";
import POSProduct from "../models/POSProduct.js";
import { requireAdmin } from "../middleware/auth.js";
import { syncPosProductsFromSalesRecords } from "../services/posIntegration.js";
import { compareCategoryThenSize } from "../utils/sizeOrder.js";

const router = express.Router();
const SAFE_TEXT_PATTERN = /^[A-Za-z0-9 .\-_/()+&]{1,100}$/;

function validateObjectId(idValue) {
  return mongoose.Types.ObjectId.isValid(String(idValue || ""));
}

function sanitizeTextInput(value, fieldName, maxLength = 100) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > maxLength ||
    !SAFE_TEXT_PATTERN.test(trimmed)
  ) {
    throw new Error(`Invalid ${fieldName} format`);
  }

  return trimmed;
}

function sanitizeOptionalText(value, fieldName, maxLength = 100) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return sanitizeTextInput(value, fieldName, maxLength);
}

function sanitizeNumber(value, fieldName, { integer = false } = {}) {
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    (integer && !Number.isInteger(number))
  ) {
    throw new Error(
      `${fieldName} must be a non-negative ${integer ? "whole number" : "number"}`,
    );
  }
  return number;
}

router.get("/", async (req, res) => {
  try {
    const products = await POSProduct.find({ active: true }).lean();
    products.sort((left, right) => compareCategoryThenSize(left, right));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Unable to load products" });
  }
});

router.get("/stock", async (req, res) => {
  try {
    const products = await POSProduct.find({ active: true }).lean();
    products.sort((left, right) => compareCategoryThenSize(left, right));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Unable to load stock" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const products = await POSProduct.find().lean();
    products.sort((left, right) => compareCategoryThenSize(left, right));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Unable to load products" });
  }
});

router.post("/sync-from-sales", requireAdmin, async (req, res) => {
  try {
    const summary = await syncPosProductsFromSalesRecords();
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ error: "Unable to sync products" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      size,
      sku,
      stockOnHand,
      stockInWarehouse,
      salesRecordId,
    } = req.body;
    const safeName = sanitizeTextInput(name, "name");
    const safeCategory = sanitizeTextInput(category, "category");
    const safeSize = sanitizeOptionalText(size, "size", 30);
    const safeSku = sanitizeOptionalText(sku, "sku", 50);

    if (salesRecordId && !validateObjectId(salesRecordId)) {
      return res.status(400).json({ error: "Invalid salesRecordId" });
    }

    const product = new POSProduct({
      name: safeName,
      price: sanitizeNumber(price, "price"),
      category: safeCategory,
      size: safeSize,
      sku: safeSku,
      stockOnHand: sanitizeNumber(stockOnHand ?? 0, "stockOnHand", {
        integer: true,
      }),
      stockInWarehouse: sanitizeNumber(
        stockInWarehouse ?? 0,
        "stockInWarehouse",
        { integer: true },
      ),
      salesRecordId: salesRecordId || null,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const {
      name,
      price,
      category,
      size,
      sku,
      active,
      stockOnHand,
      stockInWarehouse,
      salesRecordId,
    } = req.body;

    const updatePayload = {};
    if (name !== undefined) {
      updatePayload.name = sanitizeTextInput(name, "name");
    }
    if (category !== undefined) {
      updatePayload.category = sanitizeTextInput(category, "category");
    }
    if (size !== undefined) {
      updatePayload.size = sanitizeOptionalText(size, "size", 30);
    }
    if (sku !== undefined) {
      updatePayload.sku = sanitizeOptionalText(sku, "sku", 50);
    }
    if (active !== undefined) {
      if (typeof active !== "boolean") {
        throw new Error("active must be a boolean");
      }
      updatePayload.active = active;
    }

    if (salesRecordId !== undefined) {
      if (salesRecordId && !validateObjectId(salesRecordId)) {
        return res.status(400).json({ error: "Invalid salesRecordId" });
      }
      updatePayload.salesRecordId = salesRecordId || null;
    }

    if (price !== undefined) {
      updatePayload.price = sanitizeNumber(price, "price");
    }
    if (stockOnHand !== undefined) {
      updatePayload.stockOnHand = sanitizeNumber(stockOnHand, "stockOnHand", {
        integer: true,
      });
    }
    if (stockInWarehouse !== undefined) {
      updatePayload.stockInWarehouse = sanitizeNumber(
        stockInWarehouse,
        "stockInWarehouse",
        { integer: true },
      );
    }

    const product = await POSProduct.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true },
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/transfer", requireAdmin, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const quantity = Number(req.body?.quantity || 0);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res
        .status(400)
        .json({
          error: "Transfer quantity must be a whole number greater than zero",
        });
    }

    const product = await POSProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.stockInWarehouse < quantity) {
      return res.status(400).json({ error: "Not enough stock in warehouse" });
    }

    product.stockInWarehouse -= quantity;
    product.stockOnHand += quantity;
    await product.save();

    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: "Unable to transfer stock" });
  }
});

router.post("/:id/add-stock", requireAdmin, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const quantity = Number(req.body?.quantity || 0);
    const location = String(req.body?.location || "warehouse")
      .trim()
      .toLowerCase();

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res
        .status(400)
        .json({
          error: "Stock quantity must be a whole number greater than zero",
        });
    }

    if (!["warehouse", "on-hand"].includes(location)) {
      return res
        .status(400)
        .json({ error: "Stock location must be warehouse or on-hand" });
    }

    const product = await POSProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (location === "warehouse") {
      product.stockInWarehouse += quantity;
    } else {
      product.stockOnHand += quantity;
    }

    await product.save();
    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: "Unable to add stock" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const product = await POSProduct.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Unable to archive product" });
  }
});

export default router;
