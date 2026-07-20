const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function parseMonthLabel(label) {
  const [monthText, yearText] = label.split("-");
  return new Date(2000 + Number(yearText), MONTH_NAMES.indexOf(monthText), 1);
}

export function formatMonthLabel(date) {
  return `${MONTH_NAMES[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

export function getNextMonthLabel(label) {
  const date = parseMonthLabel(label);
  date.setMonth(date.getMonth() + 1);
  return formatMonthLabel(date);
}

export function roundValue(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function averageTrend(series) {
  const recent = series.slice(-6);
  const deltas = recent.slice(1).map((entry, index) => (
    entry.total - recent[index].total
  ));
  return deltas.length
    ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length
    : 0;
}

export function buildForecastFromSeries(monthlySeries, horizon = 12) {
  if (!monthlySeries.length) {
    return [];
  }

  const trend = averageTrend(monthlySeries);
  const forecast = [];
  let lastValue = monthlySeries.at(-1).total;
  let previousMonth = monthlySeries.at(-1).month;

  for (let step = 0; step < horizon; step += 1) {
    const month = getNextMonthLabel(previousMonth);
    const monthName = month.split("-")[0];
    const sameMonthHistory = monthlySeries
      .filter((entry) => entry.month.startsWith(monthName))
      .map((entry) => entry.total);
    const seasonalAverage = sameMonthHistory.length
      ? sameMonthHistory.reduce((sum, value) => sum + value, 0)
        / sameMonthHistory.length
      : lastValue;
    const trendComponent = lastValue + trend;
    const projectedTotal = Math.max(
      0,
      roundValue(trendComponent * 0.55 + seasonalAverage * 0.45)
    );

    forecast.push({
      month,
      projectedTotal,
      basis: {
        trendComponent: roundValue(trendComponent),
        seasonalAverage: roundValue(seasonalAverage)
      }
    });
    lastValue = projectedTotal;
    previousMonth = month;
  }

  return forecast;
}

export function buildRecordForecast(record, horizon = 12) {
  const months = record.months || [];
  const sales = record.sales || [];
  if (!months.length || !sales.length) {
    return [];
  }

  const history = months.map((month, index) => ({
    month,
    total: Number(sales[index] || 0)
  }));
  return buildForecastFromSeries(history, horizon).map((entry) => ({
    month: entry.month,
    projectedTotal: entry.projectedTotal
  }));
}
