import express from "express";
import path from "path";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";
import dotenv from "dotenv";
import { clientPortalDb } from "../databases.js";
import Client from "./models/Client.js";
import Settings from "./models/Settings.js";
import User from "./models/User.js";
import {
  clearPortalCookie,
  createPortalToken,
  requirePortalAdmin,
  requirePortalAuth,
  requirePortalClient,
  resolvePortalUser,
  setPortalCookie
} from "./middleware/auth.js";

dotenv.config();

const router = express.Router();
const basePath = "/clientportal";
const frontendRoot = path.join(import.meta.dirname, "../../public/templates/clientportal");
const resend = new Resend(process.env.RESEND_API_KEY);

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const MAX_LINE_ITEMS = 60;
const MAX_HOUR_ENTRIES = 120;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many sign in attempts. Please try again later." }
});

const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many portal requests. Please try again later." }
});

function validateUsername(username) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return "Username must be 3-32 characters and use only letters, numbers, dots, underscores, or hyphens";
  }
  return null;
}

function validatePassword(password) {
  if (password.length < 12 || password.length > 256) {
    return "Password must be 12-256 characters";
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include upper case, lower case, and a number";
  }
  return null;
}

function getRequiredText(value, field, maxLength) {
  if (typeof value !== "string") {
    throw new Error(`${field} is required`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
  return trimmed;
}

function getOptionalText(value, maxLength) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error("Invalid text value");
  }
  return value.trim().slice(0, maxLength);
}

function getEmail(value) {
  const email = getRequiredText(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address");
  }
  return email;
}

function getDate(value, field) {
  const date = new Date(`${String(value || "")}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} is invalid`);
  }
  return date;
}

function dateOnly(value) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().slice(0, 10);
}

function sanitizeUser(user) {
  return {
    id: user._id?.toString() || user.id,
    username: user.username,
    role: user.role,
    clientId: user.clientId?.toString() || null,
    mustChangePassword: Boolean(user.mustChangePassword)
  };
}

function serializeInvoice(invoice) {
  return {
    id: invoice._id.toString(),
    number: invoice.number,
    status: invoice.status,
    issued: dateOnly(invoice.issued),
    due: dateOnly(invoice.due),
    taxRate: invoice.taxRate,
    notes: invoice.notes || "",
    items: invoice.items.map((item) => ({
      id: item._id.toString(),
      description: item.description,
      quantity: item.quantity,
      rate: item.rate
    })),
    hours: (invoice.hours || []).map((entry) => ({
      id: entry._id.toString(),
      date: dateOnly(entry.date),
      hours: entry.hours,
      work: entry.work
    }))
  };
}

function serializeClient(client, user = null) {
  return {
    id: client._id.toString(),
    business: client.business,
    contact: client.contact,
    email: client.email,
    notes: client.notes || "",
    username: user?.username || "",
    userActive: user?.active !== false,
    invoices: client.invoices.map(serializeInvoice)
  };
}

function serializeBilling(settings) {
  return {
    businessName: settings?.businessName || "Nielsen Innovations",
    abn: settings?.abn || "",
    bankName: settings?.bankName || "",
    accountName: settings?.accountName || "",
    bsb: settings?.bsb || "",
    accountNumber: settings?.accountNumber || "",
    paymentReference: settings?.paymentReference || "Use the invoice number as payment reference",
    paymentTerms: settings?.paymentTerms || "Payment due by the invoice due date."
  };
}

async function getBillingSettings() {
  const settings = await Settings.findOneAndUpdate(
    { key: "billing" },
    { $setOnInsert: { key: "billing" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return settings;
}

function getBillingPayload(body) {
  return {
    businessName: getOptionalText(body?.businessName, 160) || "Nielsen Innovations",
    abn: getOptionalText(body?.abn, 40),
    bankName: getOptionalText(body?.bankName, 120),
    accountName: getOptionalText(body?.accountName, 160),
    bsb: getOptionalText(body?.bsb, 20),
    accountNumber: getOptionalText(body?.accountNumber, 40),
    paymentReference: getOptionalText(body?.paymentReference, 120),
    paymentTerms: getOptionalText(body?.paymentTerms, 1000)
  };
}

function getClientPayload(body) {
  const username = String(body?.username || "").trim().toLowerCase();
  const usernameError = validateUsername(username);
  if (usernameError) {
    throw new Error(usernameError);
  }

  return {
    username,
    password: String(body?.password || ""),
    business: getRequiredText(body?.business, "Business name", 160),
    contact: getRequiredText(body?.contact, "Contact name", 120),
    email: getEmail(body?.email),
    notes: getOptionalText(body?.notes, 1000),
    active: body?.active !== false
  };
}

function getInvoicePayload(body) {
  const status = ["draft", "sent", "overdue", "paid"].includes(body?.status) ? body.status : "draft";
  const items = Array.isArray(body?.items)
    ? body.items
        .filter((item) => item?.description || Number(item?.quantity || 0) > 0 || Number(item?.rate || 0) > 0)
        .slice(0, MAX_LINE_ITEMS)
    : [];
  const hours = Array.isArray(body?.hours)
    ? body.hours
        .filter((entry) => entry?.date || Number(entry?.hours || 0) > 0 || entry?.work)
        .slice(0, MAX_HOUR_ENTRIES)
    : [];

  return {
    number: getRequiredText(body?.number, "Invoice number", 40),
    status,
    issued: getDate(body?.issued, "Issued date"),
    due: getDate(body?.due, "Due date"),
    taxRate: Math.max(0, Math.min(1, Number(body?.taxRate ?? 0.1))),
    notes: getOptionalText(body?.notes, 1000),
    items: items
      .map((item) => ({
        description: getRequiredText(item?.description, "Line item description", 240),
        quantity: Math.max(0, Number(item?.quantity || 0)),
        rate: Math.max(0, Number(item?.rate || 0))
      }))
      .filter((item) => item.description),
    hours: hours
      .map((entry) => ({
        date: getDate(entry?.date, "Work date"),
        hours: Math.max(0, Number(entry?.hours || 0)),
        work: getRequiredText(entry?.work, "Work completed", 320)
      }))
      .filter((entry) => entry.hours > 0 && entry.work)
  };
}

function invoiceSubtotal(invoice) {
  return invoice.items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.rate || 0), 0);
}

function invoiceTax(invoice) {
  return invoiceSubtotal(invoice) * Number(invoice.taxRate || 0);
}

function invoiceTotal(invoice) {
  return invoiceSubtotal(invoice) + invoiceTax(invoice);
}

function invoiceHours(invoice) {
  return (invoice.hours || []).reduce((total, entry) => total + Number(entry.hours || 0), 0);
}

function money(value) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD"
  }).format(value || 0);
}

function escapeEmailHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function portalUrl(pathname = "") {
  const origin = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || "https://nielseninnovations.com";
  return `${origin.replace(/\/$/, "")}/clientportal${pathname}`;
}

function emailReady() {
  return Boolean(process.env.RESEND_API_KEY);
}

function emailFrom() {
  return process.env.CLIENT_PORTAL_EMAIL_FROM || "Nielsen Innovations <contactus@nielseninnovations.com>";
}

function invoiceEmailHtml(client, invoice, message, billing) {
  const lineRows = invoice.items.map((item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeEmailHtml(item.description)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(item.rate)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(Number(item.quantity || 0) * Number(item.rate || 0))}</td>
    </tr>
  `).join("");

  const hourRows = (invoice.hours || []).map((entry) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${dateOnly(entry.date)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${entry.hours}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeEmailHtml(entry.work)}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#111827;">
      <h2>${escapeEmailHtml(billing.businessName)} invoice ${escapeEmailHtml(invoice.number)}</h2>
      <p><strong>ABN:</strong> ${escapeEmailHtml(billing.abn || "Not supplied")}</p>
      <p>Hi ${escapeEmailHtml(client.contact)},</p>
      <p>${escapeEmailHtml(message)}</p>
      <p><strong>Total:</strong> ${money(invoiceTotal(invoice))}<br>
      <strong>Due:</strong> ${dateOnly(invoice.due)}<br>
      <strong>Status:</strong> ${invoice.status}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:18px;">
        <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Rate</th><th align="right">Amount</th></tr></thead>
        <tbody>${lineRows || '<tr><td colspan="4" style="padding:8px;">No line items listed.</td></tr>'}</tbody>
      </table>
      <p style="text-align:right;"><strong>Invoice total: ${money(invoiceTotal(invoice))}</strong></p>
      <h3>Hours breakdown</h3>
      <p><strong>Total hours:</strong> ${invoiceHours(invoice).toFixed(2)}</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th align="left">Date</th><th align="right">Hours</th><th align="left">Work completed</th></tr></thead>
        <tbody>${hourRows || '<tr><td colspan="3" style="padding:8px;">No hours recorded.</td></tr>'}</tbody>
      </table>
      <h3>Payment details</h3>
      <p>
        <strong>Bank:</strong> ${escapeEmailHtml(billing.bankName || "Not supplied")}<br>
        <strong>Account name:</strong> ${escapeEmailHtml(billing.accountName || "Not supplied")}<br>
        <strong>BSB:</strong> ${escapeEmailHtml(billing.bsb || "Not supplied")}<br>
        <strong>Account number:</strong> ${escapeEmailHtml(billing.accountNumber || "Not supplied")}<br>
        <strong>Reference:</strong> ${escapeEmailHtml(billing.paymentReference || invoice.number)}
      </p>
      <p>${escapeEmailHtml(billing.paymentTerms || "")}</p>
      <p style="margin-top:24px;"><a href="${portalUrl('/login')}">Open your client portal</a></p>
    </div>
  `;
}

async function sendPortalEmail({ to, subject, html }) {
  if (!emailReady()) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured" };
  }

  const { error } = await resend.emails.send({
    from: emailFrom(),
    to: [to],
    subject,
    html
  });

  if (error) {
    throw new Error(error.message || "Unable to send email");
  }

  return { sent: true };
}

async function seedDefaultAdmin() {
  const adminCount = await User.countDocuments({ role: "admin" });
  if (adminCount > 0) {
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const username = String(process.env.CLIENT_PORTAL_BOOTSTRAP_ADMIN_USERNAME || (!isProduction ? "admin" : "")).trim().toLowerCase();
  const password = String(process.env.CLIENT_PORTAL_BOOTSTRAP_ADMIN_PASSWORD || (!isProduction ? "password" : ""));

  if (!username || !password) {
    console.error("Client Portal admin bootstrap skipped: configure CLIENT_PORTAL_BOOTSTRAP_ADMIN_USERNAME and CLIENT_PORTAL_BOOTSTRAP_ADMIN_PASSWORD.");
    return;
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    console.error(`Client Portal admin bootstrap skipped: ${usernameError}`);
    return;
  }

  if (isProduction) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      console.error(`Client Portal admin bootstrap skipped: ${passwordError}`);
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    username,
    passwordHash,
    role: "admin",
    active: true,
    mustChangePassword: !isProduction || !process.env.CLIENT_PORTAL_BOOTSTRAP_ADMIN_PASSWORD
  });
  console.log("Created Client Portal bootstrap admin account.");
}

clientPortalDb.once("connected", () => {
  seedDefaultAdmin().catch((error) => {
    console.error("Unable to seed Client Portal admin:", error.message);
  });
});

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

async function requirePageAuth(req, res, next) {
  const user = await resolvePortalUser(req, res);
  if (!user) {
    const target = encodeURIComponent(req.originalUrl || `${basePath}/client`);
    return res.redirect(`${basePath}/login?next=${target}`);
  }
  req.portalUser = user;
  next();
}

function redirectForRole(user) {
  return user.role === "admin" ? `${basePath}/admin` : `${basePath}/client`;
}

router.get("/", async (req, res) => {
  const user = await resolvePortalUser(req, res);
  if (!user) {
    return res.redirect(`${basePath}/login`);
  }
  return res.redirect(redirectForRole(user));
});

router.get("/login", async (req, res) => {
  const user = await resolvePortalUser(req, res);
  if (user) {
    return res.redirect(redirectForRole(user));
  }
  return res.sendFile(path.join(frontendRoot, "login.html"));
});

router.get("/admin", requirePageAuth, (req, res) => {
  if (req.portalUser.role !== "admin") {
    return res.redirect(`${basePath}/client`);
  }
  return res.sendFile(path.join(frontendRoot, "admin.html"));
});

router.get("/client", requirePageAuth, (req, res) => {
  if (req.portalUser.role !== "client") {
    return res.redirect(`${basePath}/admin`);
  }
  return res.sendFile(path.join(frontendRoot, "client.html"));
});

router.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user || !user.active) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({ error: "Account temporarily locked. Please try again later." });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginCount = 0;
      }
      await user.save();
      return res.status(401).json({ error: "Invalid username or password" });
    }

    user.failedLoginCount = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const token = createPortalToken(user);
    setPortalCookie(res, token);
    return res.json({ ok: true, user: sanitizeUser(user), redirectTo: redirectForRole(user) });
  } catch (error) {
    return res.status(500).json({ error: "Unable to complete sign in" });
  }
});

router.post("/api/auth/logout", requirePortalAuth, (req, res) => {
  clearPortalCookie(res);
  res.json({ ok: true });
});

router.get("/api/auth/me", requirePortalAuth, (req, res) => {
  res.json({ user: req.portalUser });
});

router.put("/api/auth/account", requirePortalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.portalUser.id);
    if (!user || !user.active) {
      clearPortalCookie(res);
      return res.status(401).json({ error: "Session is no longer valid" });
    }

    const currentPassword = String(req.body?.currentPassword || "");
    const newUsername = String(req.body?.username || user.username).trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    const currentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const usernameError = validateUsername(newUsername);
    if (usernameError) {
      return res.status(400).json({ error: usernameError });
    }

    const existingUser = await User.findOne({ username: newUsername });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(409).json({ error: "Username already exists" });
    }

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (samePassword) {
        return res.status(400).json({ error: "New password must be different from the current password" });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.passwordChangedAt = new Date();
      user.mustChangePassword = false;
    }

    user.username = newUsername;
    await user.save();

    const token = createPortalToken(user);
    setPortalCookie(res, token);
    return res.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error("Client Portal account update error:", error);
    return res.status(500).json({ error: "Unable to update account" });
  }
});

router.get("/api/admin/clients", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  const [clients, users, billing] = await Promise.all([
    Client.find().sort({ business: 1 }),
    User.find({ role: "client" }).select("username clientId active"),
    getBillingSettings()
  ]);
  const userByClient = new Map(users.map((user) => [user.clientId?.toString(), user]));
  res.json({
    clients: clients.map((client) => serializeClient(client, userByClient.get(client._id.toString()))),
    billing: serializeBilling(billing)
  });
});

router.put("/api/admin/settings/billing", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  try {
    const settings = await getBillingSettings();
    Object.assign(settings, getBillingPayload(req.body));
    await settings.save();
    res.json({ billing: serializeBilling(settings) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to update billing settings" });
  }
});

router.post("/api/admin/clients", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  let client = null;
  try {
    const payload = getClientPayload(req.body);
    const passwordError = validatePassword(payload.password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const existingUser = await User.findOne({ username: payload.username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    client = await Client.create({
      business: payload.business,
      contact: payload.contact,
      email: payload.email,
      notes: payload.notes
    });

    const user = await User.create({
      username: payload.username,
      passwordHash: await bcrypt.hash(payload.password, 12),
      role: "client",
      clientId: client._id,
      active: payload.active,
      mustChangePassword: true
    });

    return res.status(201).json({ client: serializeClient(client, user) });
  } catch (error) {
    if (client) {
      await Client.deleteOne({ _id: client._id });
    }
    return res.status(400).json({ error: error.message || "Unable to create client" });
  }
});

router.put("/api/admin/clients/:clientId", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const user = await User.findOne({ role: "client", clientId: client._id });
    if (!user) {
      return res.status(404).json({ error: "Client login not found" });
    }

    const payload = getClientPayload(req.body);
    const existingUser = await User.findOne({ username: payload.username });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(409).json({ error: "Username already exists" });
    }

    client.business = payload.business;
    client.contact = payload.contact;
    client.email = payload.email;
    client.notes = payload.notes;
    user.username = payload.username;
    user.active = payload.active;

    if (payload.password) {
      const passwordError = validatePassword(payload.password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      user.passwordHash = await bcrypt.hash(payload.password, 12);
      user.mustChangePassword = true;
      user.failedLoginCount = 0;
      user.lockUntil = null;
    }

    await Promise.all([client.save(), user.save()]);
    return res.json({ client: serializeClient(client, user) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update client" });
  }
});

router.delete("/api/admin/clients/:clientId", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  const client = await Client.findById(req.params.clientId);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  await Promise.all([
    Client.deleteOne({ _id: client._id }),
    User.deleteMany({ role: "client", clientId: client._id })
  ]);
  res.json({ ok: true });
});

router.post("/api/admin/clients/:clientId/invoices", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    client.invoices.push(getInvoicePayload(req.body));
    await client.save();
    return res.status(201).json({ client: serializeClient(client) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to create invoice" });
  }
});

router.put("/api/admin/clients/:clientId/invoices/:invoiceId", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const invoice = client.invoices.id(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    Object.assign(invoice, getInvoicePayload(req.body));
    await client.save();
    return res.json({ client: serializeClient(client) });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update invoice" });
  }
});

router.delete("/api/admin/clients/:clientId/invoices/:invoiceId", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  const client = await Client.findById(req.params.clientId);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  const invoice = client.invoices.id(req.params.invoiceId);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  client.invoices.pull({ _id: invoice._id });
  await client.save();
  return res.json({ client: serializeClient(client) });
});

router.post("/api/admin/clients/:clientId/emails/account", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const user = await User.findOne({ role: "client", clientId: client._id });
    if (!user) {
      return res.status(404).json({ error: "Client login not found" });
    }

    const result = await sendPortalEmail({
      to: client.email,
      subject: "Your Nielsen Innovations client portal is ready",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#111827;">
          <h2>Your client portal is ready</h2>
          <p>Hi ${escapeEmailHtml(client.contact)},</p>
          <p>Your Nielsen Innovations client portal account has been created.</p>
          <p><strong>Username:</strong> ${escapeEmailHtml(user.username)}</p>
          <p>For security, your temporary password is not included in this email. Please use the password provided to you separately, then update it after signing in.</p>
          <p><a href="${portalUrl('/login')}">Open the client portal</a></p>
        </div>
      `
    });

    res.json({ ok: true, email: result });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to send account email" });
  }
});

router.post("/api/admin/clients/:clientId/invoices/:invoiceId/email", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const invoice = client.invoices.id(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const billing = serializeBilling(await getBillingSettings());
    const result = await sendPortalEmail({
      to: client.email,
      subject: `Invoice ${invoice.number} from Nielsen Innovations`,
      html: invoiceEmailHtml(client, invoice, "A new invoice is available in your client portal.", billing)
    });

    invoice.status = invoice.status === "draft" ? "sent" : invoice.status;
    await client.save();
    res.json({ ok: true, email: result, client: serializeClient(client) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to send invoice email" });
  }
});

router.post("/api/admin/clients/:clientId/invoices/:invoiceId/reminder", adminApiLimiter, requirePortalAuth, requirePortalAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const invoice = client.invoices.id(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const billing = serializeBilling(await getBillingSettings());
    const result = await sendPortalEmail({
      to: client.email,
      subject: `Reminder: invoice ${invoice.number} is due`,
      html: invoiceEmailHtml(client, invoice, "This is a friendly reminder that this invoice is still awaiting payment.", billing)
    });

    res.json({ ok: true, email: result });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to send reminder email" });
  }
});

router.get("/api/client/dashboard", requirePortalAuth, requirePortalClient, async (req, res) => {
  const [client, billing] = await Promise.all([
    Client.findById(req.portalUser.clientId),
    getBillingSettings()
  ]);
  if (!client) {
    return res.status(404).json({ error: "Client record not found" });
  }
  res.json({ client: serializeClient(client), user: req.portalUser, billing: serializeBilling(billing) });
});

export default router;
