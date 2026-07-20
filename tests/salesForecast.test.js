import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardMetrics } from "../backend/hfssuniformsapp/services/salesAnalytics.js";
import {
  buildForecastFromSeries,
  getNextMonthLabel
} from "../backend/hfssuniformsapp/services/salesForecast.js";
import { validateSalesSeries } from "../backend/hfssuniformsapp/utils/salesValidation.js";

test("month labels advance across year boundaries", () => {
  assert.equal(getNextMonthLabel("Dec-25"), "Jan-26");
});

test("forecasts preserve the requested horizon and never fall below zero", () => {
  const forecast = buildForecastFromSeries([
    { month: "Jan-25", total: 10 },
    { month: "Feb-25", total: 8 },
    { month: "Mar-25", total: 6 }
  ], 4);

  assert.equal(forecast.length, 4);
  assert.ok(forecast.every((entry) => entry.projectedTotal >= 0));
});

test("empty dashboard data returns the stable response contract", () => {
  const metrics = buildDashboardMetrics([]);

  assert.deepEqual(metrics.monthlySeries, []);
  assert.deepEqual(metrics.forecast, []);
  assert.equal(metrics.totals.currentTotal, 0);
});

test("sales series validation rejects mismatched arrays", () => {
  assert.throws(
    () => validateSalesSeries(["Jan-25"], []),
    /same length/
  );
});
