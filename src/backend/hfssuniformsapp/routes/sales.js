import express from "express";
import Sales from "../models/Sales.js";
import { buildDashboardMetrics } from "../services/salesAnalytics.js";
import { syncPosProductsFromSalesRecords } from "../services/posIntegration.js";
import { compareCategoryThenSize, compareSizeValues } from "../utils/sizeOrder.js";
import {
  isValidObjectId,
  sanitizeSalesText,
  validateSalesSeries
} from "../utils/salesValidation.js";

const router = express.Router();

function requireValidId(req, res, next) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid sales record id" });
  }
  return next();
}

router.get("/sales", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category !== undefined) {
      filter.category = sanitizeSalesText(req.query.category, "category");
    }
    if (req.query.size !== undefined) {
      filter.size = sanitizeSalesText(req.query.size, "size");
    }

    const sales = await Sales.find(filter).lean();
    sales.sort(compareCategoryThenSize);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    res.json(buildDashboardMetrics(await Sales.find({}).lean()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/sales/:id", requireValidId, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    return sale
      ? res.json(sale)
      : res.status(404).json({ error: "Sales record not found" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const category = sanitizeSalesText(req.body.category, "category");
    const size = sanitizeSalesText(req.body.size, "size");
    validateSalesSeries(req.body.months, req.body.sales);

    if (await Sales.exists({ category, size })) {
      return res.status(400).json({
        error: "Sales record for this category-size combination already exists"
      });
    }

    const sale = await Sales.create({
      category,
      size,
      months: req.body.months,
      sales: req.body.sales
    });
    await syncPosProductsFromSalesRecords();
    return res.status(201).json(sale);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put("/sales/:id", requireValidId, async (req, res) => {
  try {
    const update = {};
    if (req.body.category !== undefined) {
      update.category = sanitizeSalesText(req.body.category, "category");
    }
    if (req.body.size !== undefined) {
      update.size = sanitizeSalesText(req.body.size, "size");
    }
    if (req.body.months !== undefined || req.body.sales !== undefined) {
      validateSalesSeries(req.body.months, req.body.sales);
      update.months = req.body.months;
      update.sales = req.body.sales;
    }

    const sale = await Sales.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    if (!sale) {
      return res.status(404).json({ error: "Sales record not found" });
    }
    await syncPosProductsFromSalesRecords();
    return res.json(sale);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/sales/:id/add-month", requireValidId, async (req, res) => {
  try {
    const { month, value } = req.body;
    if (!month || value === undefined) {
      return res.status(400).json({ error: "Month and value are required" });
    }

    const sale = await Sales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "Sales record not found" });
    }
    if (sale.months.includes(month)) {
      return res.status(400).json({
        error: `Month ${month} already exists for this record`
      });
    }

    sale.months.push(month);
    sale.sales.push(value);
    await sale.save();
    return res.json(sale);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch("/sales/:id/month/:monthIndex", requireValidId, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "Sales record not found" });
    }

    const monthIndex = Number.parseInt(req.params.monthIndex, 10);
    if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex >= sale.sales.length) {
      return res.status(400).json({
        error: `Invalid month index (0-${sale.sales.length - 1})`
      });
    }

    sale.sales[monthIndex] = req.body.value;
    await sale.save();
    return res.json(sale);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete("/sales/:id", requireValidId, async (req, res) => {
  try {
    const deleted = await Sales.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Sales record not found" });
    }
    await syncPosProductsFromSalesRecords();
    return res.json({ message: "Sales record deleted successfully", deleted });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/metadata/months", async (req, res) => {
  try {
    const firstRecord = await Sales.findOne().select("months").lean();
    res.json({ months: firstRecord?.months || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/metadata/categories", async (req, res) => {
  try {
    res.json({ categories: await Sales.distinct("category") });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/metadata/categories/:category/sizes", async (req, res) => {
  try {
    const category = sanitizeSalesText(req.params.category, "category");
    const records = await Sales.find({ category }).select("size").lean();
    const sizes = [...new Set(
      records.map((item) => String(item.size || "").trim()).filter(Boolean)
    )].sort(compareSizeValues);
    res.json({ category, sizes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
