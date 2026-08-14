import express from "express";
import Sales from "../models/Sales.js";
import { buildDashboardMetrics } from "../services/salesAnalytics.js";
import { syncPosProductsFromSalesRecords } from "../services/posIntegration.js";
import {
  compareCategoryThenSize,
  compareSizeValues,
} from "../utils/sizeOrder.js";
import {
  isValidObjectId,
  sanitizeSalesText,
  validateSalesSeries,
} from "../utils/salesValidation.js";
import { requireAdmin } from "../middleware/auth.js";

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
    res.status(500).json({ error: "Unable to load sales records" });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    res.json(buildDashboardMetrics(await Sales.find({}).lean()));
  } catch (error) {
    res.status(500).json({ error: "Unable to load dashboard data" });
  }
});

router.get("/sales/:id", requireValidId, async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    return sale
      ? res.json(sale)
      : res.status(404).json({ error: "Sales record not found" });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load sales record" });
  }
});

router.post("/sales", requireAdmin, async (req, res) => {
  try {
    const category = sanitizeSalesText(req.body.category, "category");
    const size = sanitizeSalesText(req.body.size, "size");
    const series = validateSalesSeries(req.body.months, req.body.sales);

    if (await Sales.exists({ category, size })) {
      return res.status(400).json({
        error: "Sales record for this category-size combination already exists",
      });
    }

    const sale = await Sales.create({
      category,
      size,
      months: series.months,
      sales: series.sales,
    });
    await syncPosProductsFromSalesRecords();
    return res.status(201).json(sale);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.put("/sales/:id", requireAdmin, requireValidId, async (req, res) => {
  try {
    const update = {};
    if (req.body.category !== undefined) {
      update.category = sanitizeSalesText(req.body.category, "category");
    }
    if (req.body.size !== undefined) {
      update.size = sanitizeSalesText(req.body.size, "size");
    }
    if (req.body.months !== undefined || req.body.sales !== undefined) {
      const series = validateSalesSeries(req.body.months, req.body.sales);
      update.months = series.months;
      update.sales = series.sales;
    }

    const sale = await Sales.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
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

router.post("/sales/:id/add-month", requireAdmin, requireValidId, async (req, res) => {
  try {
    const { month, value } = req.body;
    if (!month || value === undefined) {
      return res.status(400).json({ error: "Month and value are required" });
    }

    const series = validateSalesSeries([month], [value]);
    const safeMonth = series.months[0];
    const safeValue = series.sales[0];
    const sale = await Sales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "Sales record not found" });
    }
    if (sale.months.includes(safeMonth)) {
      return res.status(400).json({
        error: `Month ${safeMonth} already exists for this record`,
      });
    }

    sale.months.push(safeMonth);
    sale.sales.push(safeValue);
    await sale.save();
    return res.json(sale);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch(
  "/sales/:id/month/:monthIndex",
  requireAdmin,
  requireValidId,
  async (req, res) => {
    try {
      const sale = await Sales.findById(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sales record not found" });
      }

      const monthIndex = /^\d+$/.test(req.params.monthIndex)
        ? Number(req.params.monthIndex)
        : Number.NaN;
      if (
        !Number.isInteger(monthIndex) ||
        monthIndex < 0 ||
        monthIndex >= sale.sales.length
      ) {
        return res.status(400).json({
          error: `Invalid month index (0-${sale.sales.length - 1})`,
        });
      }

      sale.sales[monthIndex] = validateSalesSeries(
        [sale.months[monthIndex]],
        [req.body.value],
      ).sales[0];
      await sale.save();
      return res.json(sale);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
);

router.delete("/sales/:id", requireAdmin, requireValidId, async (req, res) => {
  try {
    const deleted = await Sales.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Sales record not found" });
    }
    await syncPosProductsFromSalesRecords();
    return res.json({ message: "Sales record deleted successfully", deleted });
  } catch (error) {
    return res.status(500).json({ error: "Unable to delete sales record" });
  }
});

router.get("/metadata/months", async (req, res) => {
  try {
    const firstRecord = await Sales.findOne().select("months").lean();
    res.json({ months: firstRecord?.months || [] });
  } catch (error) {
    res.status(500).json({ error: "Unable to load month metadata" });
  }
});

router.get("/metadata/categories", async (req, res) => {
  try {
    res.json({ categories: await Sales.distinct("category") });
  } catch (error) {
    res.status(500).json({ error: "Unable to load category metadata" });
  }
});

router.get("/metadata/categories/:category/sizes", async (req, res) => {
  try {
    const category = sanitizeSalesText(req.params.category, "category");
    const records = await Sales.find({ category }).select("size").lean();
    const sizes = [
      ...new Set(
        records.map((item) => String(item.size || "").trim()).filter(Boolean),
      ),
    ].sort(compareSizeValues);
    res.json({ category, sizes });
  } catch (error) {
    res.status(500).json({ error: "Unable to load size metadata" });
  }
});

export default router;
