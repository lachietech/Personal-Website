import { compareCategoryThenSize, compareSizeValues } from "../utils/sizeOrder.js";
import {
  buildForecastFromSeries,
  buildRecordForecast,
  parseMonthLabel,
  roundValue
} from "./salesForecast.js";

export function buildDashboardMetrics(records) {
  if (!records.length) {
    return {
      totals: {
        currentMonth: null,
        previousMonth: null,
        currentTotal: 0,
        previousTotal: 0,
        monthOverMonthDelta: 0,
        monthOverMonthPercent: 0,
        yearOverYearDelta: null,
        yearOverYearPercent: null,
        yearOverYearMonth: null,
        yearOverYearTotal: null
      },
      monthlySeries: [],
      categoryBreakdown: [],
      sizeSnapshot: [],
      forecastSummary: {
        forecastHorizon: 12,
        projectedYearTotal: 0,
        projectedAverageMonthly: 0
      },
      projectionVsCurrentProgress: {
        currentYear: null,
        asOfMonth: null,
        projectedYearTotal: 0,
        actualToDateTotal: 0,
        remainingToProjection: 0,
        completionPercent: null,
        categoryBreakdown: []
      },
      yearProjectionComparison: {
        currentYear: null,
        previousYear: null,
        currentYearTotal: 0,
        previousYearTotal: 0,
        delta: 0,
        deltaPercent: null,
        sizeBreakdown: [],
        monthly: []
      },
      forecast: []
    };
  }

  const canonicalMonths = records[0].months || [];
  const monthlySeries = canonicalMonths.map((month, index) => {
    let total = 0;
    for (const record of records) {
      total += Number(record.sales?.[index] || 0);
    }
    return { month, total: roundValue(total) };
  });

  const currentPoint = monthlySeries.at(-1) || null;
  const previousPoint = monthlySeries.at(-2) || null;
  const currentTotal = currentPoint?.total || 0;
  const previousTotal = previousPoint?.total || 0;
  const monthOverMonthDelta = currentTotal - previousTotal;
  const monthOverMonthPercent = previousTotal === 0 ? null : roundValue((monthOverMonthDelta / previousTotal) * 100);

  let yearOverYearPoint = null;
  if (currentPoint) {
    const [currentMonthName, currentYearText] = currentPoint.month.split("-");
    const priorYearLabel = `${currentMonthName}-${String(Number(currentYearText) - 1).padStart(2, "0")}`;
    yearOverYearPoint = monthlySeries.find((entry) => entry.month === priorYearLabel) || null;
  }

  const yearOverYearDelta = yearOverYearPoint ? currentTotal - yearOverYearPoint.total : null;
  const yearOverYearPercent = yearOverYearPoint && yearOverYearPoint.total !== 0
    ? roundValue((yearOverYearDelta / yearOverYearPoint.total) * 100)
    : null;

  const currentMonthIndex = canonicalMonths.length - 1;
  const yearOverYearIndex = yearOverYearPoint
    ? canonicalMonths.findIndex((month) => month === yearOverYearPoint.month)
    : -1;

  const categoryBreakdown = [];
  const byCategory = new Map();
  for (const record of records) {
    const currentValue = Number(record.sales?.[canonicalMonths.length - 1] || 0);
    const previousValue = Number(record.sales?.[canonicalMonths.length - 2] || 0);
    const categoryEntry = byCategory.get(record.category) || { category: record.category, currentTotal: 0, previousTotal: 0 };
    categoryEntry.currentTotal += currentValue;
    categoryEntry.previousTotal += previousValue;
    byCategory.set(record.category, categoryEntry);
  }

  for (const entry of byCategory.values()) {
    const delta = entry.currentTotal - entry.previousTotal;
    categoryBreakdown.push({
      category: entry.category,
      currentTotal: roundValue(entry.currentTotal),
      previousTotal: roundValue(entry.previousTotal),
      delta: roundValue(delta),
      deltaPercent: entry.previousTotal === 0 ? null : roundValue((delta / entry.previousTotal) * 100)
    });
  }

  categoryBreakdown.sort((left, right) => right.currentTotal - left.currentTotal);

  const sizeSnapshot = records.map((record) => {
    const currentValue = Number(record.sales?.[currentMonthIndex] || 0);
    const yearAgoValue = yearOverYearIndex >= 0 ? Number(record.sales?.[yearOverYearIndex] || 0) : null;
    const delta = yearAgoValue === null ? null : currentValue - yearAgoValue;

    return {
      category: record.category,
      size: record.size,
      currentTotal: roundValue(currentValue),
      yearOverYearTotal: yearAgoValue === null ? null : roundValue(yearAgoValue),
      delta: delta === null ? null : roundValue(delta),
      deltaPercent: yearAgoValue === null || yearAgoValue === 0 ? null : roundValue((delta / yearAgoValue) * 100)
    };
  });

  sizeSnapshot.sort((left, right) => {
    return compareCategoryThenSize(left, right);
  });

  const forecast = buildForecastFromSeries(monthlySeries, 12);

  const projectedYearTotal = roundValue(forecast.reduce((sum, item) => sum + item.projectedTotal, 0));
  const projectedAverageMonthly = forecast.length ? roundValue(projectedYearTotal / forecast.length) : 0;

  const monthlyActualMap = new Map(monthlySeries.map((item) => [item.month, item.total]));
  const monthlyForecastMap = new Map(forecast.map((item) => [item.month, item.projectedTotal]));
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentCalendarYear = new Date().getFullYear();
  const previousCalendarYear = currentCalendarYear - 1;
  const currentYearSuffix = String(currentCalendarYear).slice(-2);

  const currentYearMonthIndexes = canonicalMonths
    .map((label, index) => ({ label, index }))
    .filter((entry) => entry.label.endsWith(`-${currentYearSuffix}`));
  const asOfMonthLabel = currentYearMonthIndexes.length
    ? currentYearMonthIndexes[currentYearMonthIndexes.length - 1].label
    : null;

  const recordMonthlyMaps = records.map((record) => {
    const recordSeries = (record.months || []).map((month, index) => ({
      month,
      total: Number(record.sales?.[index] || 0)
    }));
    const recordForecast = buildForecastFromSeries(recordSeries, 12);
    return {
      category: record.category,
      size: record.size,
      actual: new Map(recordSeries.map((item) => [item.month, item.total])),
      projected: new Map(recordForecast.map((item) => [item.month, item.projectedTotal]))
    };
  });

  const getMonthValue = (year, monthName) => {
    const label = `${monthName}-${String(year).slice(-2)}`;
    if (monthlyActualMap.has(label)) {
      return { value: monthlyActualMap.get(label), source: "actual" };
    }
    if (monthlyForecastMap.has(label)) {
      return { value: monthlyForecastMap.get(label), source: "projected" };
    }
    return { value: 0, source: "projected" };
  };

  const yearlyMonthlyComparison = monthNames.map((monthName) => {
    const current = getMonthValue(currentCalendarYear, monthName);
    const previous = getMonthValue(previousCalendarYear, monthName);
    const delta = current.value - previous.value;

    const sizeBreakdown = recordMonthlyMaps.map((entry) => {
      const currentLabel = `${monthName}-${String(currentCalendarYear).slice(-2)}`;
      const previousLabel = `${monthName}-${String(previousCalendarYear).slice(-2)}`;

      const currentHasActual = entry.actual.has(currentLabel);
      const previousHasActual = entry.actual.has(previousLabel);

      const currentValue = currentHasActual
        ? Number(entry.actual.get(currentLabel) || 0)
        : Number(entry.projected.get(currentLabel) || 0);
      const previousValue = previousHasActual
        ? Number(entry.actual.get(previousLabel) || 0)
        : Number(entry.projected.get(previousLabel) || 0);
      const rowDelta = currentValue - previousValue;

      return {
        category: entry.category,
        size: entry.size,
        currentYearValue: roundValue(currentValue),
        previousYearValue: roundValue(previousValue),
        delta: roundValue(rowDelta),
        deltaPercent: previousValue === 0 ? null : roundValue((rowDelta / previousValue) * 100),
        currentYearSource: currentHasActual ? "actual" : "projected",
        previousYearSource: previousHasActual ? "actual" : "projected"
      };
    });

    sizeBreakdown.sort((left, right) => {
      return compareCategoryThenSize(left, right);
    });

    const groupedCategories = [];
    const groupMap = new Map();
    for (const row of sizeBreakdown) {
      const existing = groupMap.get(row.category) || {
        category: row.category,
        currentYearTotal: 0,
        previousYearTotal: 0,
        delta: 0,
        deltaPercent: null,
        sizes: []
      };
      existing.currentYearTotal += row.currentYearValue;
      existing.previousYearTotal += row.previousYearValue;
      existing.sizes.push(row);
      groupMap.set(row.category, existing);
    }

    for (const value of groupMap.values()) {
      value.currentYearTotal = roundValue(value.currentYearTotal);
      value.previousYearTotal = roundValue(value.previousYearTotal);
      value.delta = roundValue(value.currentYearTotal - value.previousYearTotal);
      value.deltaPercent = value.previousYearTotal === 0
        ? null
        : roundValue((value.delta / value.previousYearTotal) * 100);
      groupedCategories.push(value);
    }

    groupedCategories.sort((left, right) => left.category.localeCompare(right.category));

    return {
      month: monthName,
      currentYearValue: roundValue(current.value),
      previousYearValue: roundValue(previous.value),
      delta: roundValue(delta),
      deltaPercent: previous.value === 0 ? null : roundValue((delta / previous.value) * 100),
      currentYearSource: current.source,
      previousYearSource: previous.source,
      categoryBreakdown: groupedCategories
    };
  });

  const currentYearTotal = roundValue(yearlyMonthlyComparison.reduce((sum, item) => sum + item.currentYearValue, 0));
  const previousYearTotal = roundValue(yearlyMonthlyComparison.reduce((sum, item) => sum + item.previousYearValue, 0));
  const yearlyDelta = roundValue(currentYearTotal - previousYearTotal);
  const yearlyDeltaPercent = previousYearTotal === 0 ? null : roundValue((yearlyDelta / previousYearTotal) * 100);

  const yearProjectionSizeBreakdown = records.map((record) => {
    const recordActualMap = new Map((record.months || []).map((month, index) => [month, Number(record.sales?.[index] || 0)]));
    const recordForecastMap = new Map(buildRecordForecast(record, 24).map((item) => [item.month, item.projectedTotal]));

    const getRecordMonthValue = (year, monthName) => {
      const label = `${monthName}-${String(year).slice(-2)}`;
      if (recordActualMap.has(label)) {
        return recordActualMap.get(label);
      }
      if (recordForecastMap.has(label)) {
        return recordForecastMap.get(label);
      }
      return 0;
    };

    let currentYearSizeTotal = 0;
    let previousYearSizeTotal = 0;
    for (const monthName of monthNames) {
      currentYearSizeTotal += getRecordMonthValue(currentCalendarYear, monthName);
      previousYearSizeTotal += getRecordMonthValue(previousCalendarYear, monthName);
    }

    const delta = currentYearSizeTotal - previousYearSizeTotal;
    return {
      category: record.category,
      size: record.size,
      currentYearTotal: roundValue(currentYearSizeTotal),
      previousYearTotal: roundValue(previousYearSizeTotal),
      delta: roundValue(delta),
      deltaPercent: previousYearSizeTotal === 0 ? null : roundValue((delta / previousYearSizeTotal) * 100)
    };
  });

  yearProjectionSizeBreakdown.sort((left, right) => {
    return compareCategoryThenSize(left, right);
  });

  const progressByCategory = new Map();
  for (const record of records) {
    const recordActualMap = new Map((record.months || []).map((month, index) => [month, Number(record.sales?.[index] || 0)]));
    const recordForecastMap = new Map(buildRecordForecast(record, 24).map((item) => [item.month, item.projectedTotal]));

    let projectedYearTotalForSize = 0;
    let actualToDateForSize = 0;
    let expectedRemainingForSize = 0;
    let previousYearRemainingForSize = 0;

    for (const monthName of monthNames) {
      const label = `${monthName}-${currentYearSuffix}`;
      const projectedValue = recordActualMap.has(label)
        ? Number(recordActualMap.get(label) || 0)
        : Number(recordForecastMap.get(label) || 0);
      projectedYearTotalForSize += projectedValue;

      if (asOfMonthLabel) {
        const monthDate = parseMonthLabel(label);
        const asOfDate = parseMonthLabel(asOfMonthLabel);
        
        if (monthDate <= asOfDate) {
          actualToDateForSize += Number(recordActualMap.get(label) || 0);
        } else {
          // Future-month likelihood compares the forecast with last year's actuals.
          expectedRemainingForSize += Number(recordForecastMap.get(label) || 0);
          
          const prevYearLabel = `${monthName}-${String(previousCalendarYear).slice(-2)}`;
          previousYearRemainingForSize += Number(recordActualMap.get(prevYearLabel) || 0);
        }
      }
    }

    let likelihoodForSize = null;
    if (asOfMonthLabel && previousYearRemainingForSize > 0) {
      likelihoodForSize = roundValue((expectedRemainingForSize / previousYearRemainingForSize) * 100);
    }

    const sizeEntry = {
      size: record.size,
      projectedYearTotal: roundValue(projectedYearTotalForSize),
      actualToDateTotal: roundValue(actualToDateForSize),
      remainingToProjection: roundValue(projectedYearTotalForSize - actualToDateForSize),
      completionPercent: projectedYearTotalForSize === 0
        ? null
        : roundValue((actualToDateForSize / projectedYearTotalForSize) * 100),
      likelihoodOfReachingProjection: likelihoodForSize
    };

    const categoryEntry = progressByCategory.get(record.category) || {
      category: record.category,
      projectedYearTotal: 0,
      actualToDateTotal: 0,
      remainingToProjection: 0,
      completionPercent: null,
      sizes: []
    };

    categoryEntry.projectedYearTotal += projectedYearTotalForSize;
    categoryEntry.actualToDateTotal += actualToDateForSize;
    categoryEntry.remainingToProjection += projectedYearTotalForSize - actualToDateForSize;
    categoryEntry.sizes.push(sizeEntry);
    progressByCategory.set(record.category, categoryEntry);
  }

  const progressCategoryBreakdown = [];
  for (const entry of progressByCategory.values()) {
    entry.projectedYearTotal = roundValue(entry.projectedYearTotal);
    entry.actualToDateTotal = roundValue(entry.actualToDateTotal);
    entry.remainingToProjection = roundValue(entry.remainingToProjection);
    entry.completionPercent = entry.projectedYearTotal === 0
      ? null
      : roundValue((entry.actualToDateTotal / entry.projectedYearTotal) * 100);
    
    let categoryLikelihood = null;
    const categoryTotalPrevYearRemaining = entry.sizes.reduce((sum, size) => {
      if (size.likelihoodOfReachingProjection !== null) {
        return sum + (size.projectedYearTotal > size.actualToDateTotal 
          ? (size.projectedYearTotal - size.actualToDateTotal) / (size.likelihoodOfReachingProjection / 100)
          : 0);
      }
      return sum;
    }, 0);
    
    if (categoryTotalPrevYearRemaining > 0) {
      const categoryTotalExpectedRemaining = entry.sizes.reduce((sum, size) => {
        if (size.likelihoodOfReachingProjection !== null && size.projectedYearTotal > size.actualToDateTotal) {
          const prevYearRemaining = (size.projectedYearTotal - size.actualToDateTotal) / (size.likelihoodOfReachingProjection / 100);
          return sum + (prevYearRemaining * size.likelihoodOfReachingProjection / 100);
        }
        return sum;
      }, 0);
      categoryLikelihood = roundValue((categoryTotalExpectedRemaining / categoryTotalPrevYearRemaining) * 100);
    }
    entry.likelihoodOfReachingProjection = categoryLikelihood;
    
    entry.sizes.sort((left, right) => compareSizeValues(left.size, right.size));
    progressCategoryBreakdown.push(entry);
  }
  progressCategoryBreakdown.sort((left, right) => left.category.localeCompare(right.category));

  const projectedYearTotalProgress = roundValue(progressCategoryBreakdown.reduce((sum, entry) => sum + entry.projectedYearTotal, 0));
  const actualToDateTotalProgress = roundValue(progressCategoryBreakdown.reduce((sum, entry) => sum + entry.actualToDateTotal, 0));
  const remainingToProjectionProgress = roundValue(projectedYearTotalProgress - actualToDateTotalProgress);
  const completionPercentProgress = projectedYearTotalProgress === 0
    ? null
    : roundValue((actualToDateTotalProgress / projectedYearTotalProgress) * 100);


  return {
    totals: {
      currentMonth: currentPoint?.month || null,
      previousMonth: previousPoint?.month || null,
      currentTotal: roundValue(currentTotal),
      previousTotal: roundValue(previousTotal),
      monthOverMonthDelta: roundValue(monthOverMonthDelta),
      monthOverMonthPercent,
      yearOverYearDelta: yearOverYearDelta === null ? null : roundValue(yearOverYearDelta),
      yearOverYearPercent,
      yearOverYearMonth: yearOverYearPoint?.month || null,
      yearOverYearTotal: yearOverYearPoint ? roundValue(yearOverYearPoint.total) : null
    },
    monthlySeries,
    categoryBreakdown,
    sizeSnapshot,
    forecastSummary: {
      forecastHorizon: forecast.length,
      projectedYearTotal,
      projectedAverageMonthly
    },
    projectionVsCurrentProgress: {
      currentYear: currentCalendarYear,
      asOfMonth: asOfMonthLabel,
      projectedYearTotal: projectedYearTotalProgress,
      actualToDateTotal: actualToDateTotalProgress,
      remainingToProjection: remainingToProjectionProgress,
      completionPercent: completionPercentProgress,
      categoryBreakdown: progressCategoryBreakdown
    },
    yearProjectionComparison: {
      currentYear: currentCalendarYear,
      previousYear: previousCalendarYear,
      currentYearTotal,
      previousYearTotal,
      delta: yearlyDelta,
      deltaPercent: yearlyDeltaPercent,
      sizeBreakdown: yearProjectionSizeBreakdown,
      monthly: yearlyMonthlyComparison
    },
    forecast
  };
}
