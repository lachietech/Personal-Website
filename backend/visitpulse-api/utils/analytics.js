const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const RETENTION_MS = 1000 * 60 * 60 * 24 * 395;

function cleanString(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function getAnalyticsPayload(body, userAgent = "") {
  const sessionId = cleanString(body?.sessionId, 64);
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error("Invalid analytics session");
  }

  const rawPath = cleanString(body?.path, 300);
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    throw new Error("Invalid analytics path");
  }
  const path = rawPath.split(/[?#]/, 1)[0] || "/";

  let referrer = "Direct";
  const rawReferrer = cleanString(body?.referrer, 500);
  if (rawReferrer) {
    try {
      const url = new URL(rawReferrer);
      referrer = cleanString(url.hostname, 160) || "Direct";
    } catch {
      referrer = "Direct";
    }
  }

  const agent = String(userAgent).slice(0, 500);
  const device = /ipad|tablet/i.test(agent)
    ? "Tablet"
    : /mobile|iphone|android/i.test(agent)
      ? "Mobile"
      : agent
        ? "Desktop"
        : "Other";
  const browser = /edg\//i.test(agent)
    ? "Edge"
    : /firefox\//i.test(agent)
      ? "Firefox"
      : /chrome\//i.test(agent)
        ? "Chrome"
        : /safari\//i.test(agent)
          ? "Safari"
          : "Other";
  const occurredAt = new Date();

  return {
    sessionId,
    path,
    title: cleanString(body?.title, 160),
    referrer,
    device,
    browser,
    occurredAt,
    expiresAt: new Date(occurredAt.getTime() + RETENTION_MS),
  };
}

export function getAnalyticsStartDate(days, now = new Date()) {
  const allowedDays = new Set([7, 30, 90]);
  const safeDays = allowedDays.has(Number(days)) ? Number(days) : 30;
  return {
    days: safeDays,
    startDate: new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000),
  };
}

function rankEvents(events, field) {
  const values = new Map();
  for (const event of events) {
    const label = event[field] || "Other";
    const current = values.get(label) || { views: 0, sessions: new Set() };
    current.views += 1;
    current.sessions.add(event.sessionId);
    values.set(label, current);
  }

  return [...values.entries()]
    .map(([label, value]) => ({
      [field]: label,
      views: value.views,
      visitors: value.sessions.size,
    }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 10);
}

export function buildAnalyticsSummary(events, days) {
  const sessions = new Set();
  const dailyValues = new Map();

  for (const event of events) {
    sessions.add(event.sessionId);
    const date = new Date(event.occurredAt).toISOString().slice(0, 10);
    const current = dailyValues.get(date) || {
      views: 0,
      sessions: new Set(),
    };
    current.views += 1;
    current.sessions.add(event.sessionId);
    dailyValues.set(date, current);
  }

  const pageViews = events.length;
  const visitors = sessions.size;
  return {
    days,
    totals: {
      pageViews,
      visitors,
      viewsPerVisitor: visitors
        ? Number((pageViews / visitors).toFixed(1))
        : 0,
    },
    daily: [...dailyValues.entries()]
      .map(([date, value]) => ({
        date,
        views: value.views,
        visitors: value.sessions.size,
      }))
      .sort((left, right) => left.date.localeCompare(right.date)),
    pages: rankEvents(events, "path"),
    referrers: rankEvents(events, "referrer"),
    devices: rankEvents(events, "device"),
    browsers: rankEvents(events, "browser"),
    recent: events.slice(0, 20).map(({ sessionId, ...event }) => event),
  };
}
