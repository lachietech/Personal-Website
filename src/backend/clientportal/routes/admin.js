import bcrypt from "bcryptjs";
import express from "express";
import { adminApiLimiter } from "../config.js";
import { requirePortalAdmin, requirePortalAuth } from "../middleware/auth.js";
import Client from "../models/Client.js";
import User from "../models/User.js";
import {
  escapeEmailHtml,
  getBillingPayload,
  getBillingSettings,
  getClientPayload,
  getInvoicePayload,
  portalUrl,
  serializeBilling,
  serializeClient,
  validatePassword
} from "../helpers/portal-data.js";
import { invoiceEmailHtml, sendPortalEmail } from "../helpers/emails.js";

const router = express.Router();
router.use(adminApiLimiter, requirePortalAuth, requirePortalAdmin);

async function loadClientAndInvoice(clientId, invoiceId) {
  const client = await Client.findById(clientId);
  const invoice = client?.invoices.id(invoiceId);
  return { client, invoice };
}

function respondWithMissingRecord(res, client, invoice) {
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return true;
  }
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return true;
  }
  return false;
}

async function sendInvoiceMessage({ client, invoice, subject, message }) {
  const billing = serializeBilling(await getBillingSettings());
  return sendPortalEmail({
    to: client.email,
    subject,
    html: invoiceEmailHtml(client, invoice, message, billing)
  });
}

router.get("/clients", async (req, res) => {
  const [clients, users, billing] = await Promise.all([
    Client.find().sort({ business: 1 }),
    User.find({ role: "client" }).select("username clientId active"),
    getBillingSettings()
  ]);
  const userByClient = new Map(users.map((user) => [user.clientId?.toString(), user]));

  res.json({
    clients: clients.map((client) => (
      serializeClient(client, userByClient.get(client._id.toString()))
    )),
    billing: serializeBilling(billing)
  });
});

router.put("/settings/billing", async (req, res) => {
  try {
    const settings = await getBillingSettings();
    Object.assign(settings, getBillingPayload(req.body));
    await settings.save();
    res.json({ billing: serializeBilling(settings) });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to update billing settings"
    });
  }
});

router.post("/clients", async (req, res) => {
  let client;
  try {
    const payload = getClientPayload(req.body);
    const passwordError = validatePassword(payload.password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
    if (await User.exists({ username: payload.username })) {
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
    return res.status(400).json({
      error: error.message || "Unable to create client"
    });
  }
});

router.put("/clients/:clientId", async (req, res) => {
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
    const duplicate = await User.findOne({
      username: payload.username,
      _id: { $ne: user._id }
    });
    if (duplicate) {
      return res.status(409).json({ error: "Username already exists" });
    }

    Object.assign(client, {
      business: payload.business,
      contact: payload.contact,
      email: payload.email,
      notes: payload.notes
    });
    Object.assign(user, {
      username: payload.username,
      active: payload.active
    });

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
    return res.status(400).json({
      error: error.message || "Unable to update client"
    });
  }
});

router.delete("/clients/:clientId", async (req, res) => {
  const client = await Client.findById(req.params.clientId);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  await Promise.all([
    Client.deleteOne({ _id: client._id }),
    User.deleteMany({ role: "client", clientId: client._id })
  ]);
  return res.json({ ok: true });
});

router.post("/clients/:clientId/invoices", async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }
    client.invoices.push(getInvoicePayload(req.body));
    await client.save();
    return res.status(201).json({ client: serializeClient(client) });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to create invoice"
    });
  }
});

router.put("/clients/:clientId/invoices/:invoiceId", async (req, res) => {
  try {
    const { client, invoice } = await loadClientAndInvoice(
      req.params.clientId,
      req.params.invoiceId
    );
    if (respondWithMissingRecord(res, client, invoice)) {
      return;
    }

    Object.assign(invoice, getInvoicePayload(req.body));
    await client.save();
    return res.json({ client: serializeClient(client) });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to update invoice"
    });
  }
});

router.delete("/clients/:clientId/invoices/:invoiceId", async (req, res) => {
  const { client, invoice } = await loadClientAndInvoice(
    req.params.clientId,
    req.params.invoiceId
  );
  if (respondWithMissingRecord(res, client, invoice)) {
    return;
  }

  client.invoices.pull({ _id: invoice._id });
  await client.save();
  return res.json({ client: serializeClient(client) });
});

router.post("/clients/:clientId/emails/account", async (req, res) => {
  try {
    const client = await Client.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const user = await User.findOne({ role: "client", clientId: client._id });
    if (!user) {
      return res.status(404).json({ error: "Client login not found" });
    }

    const email = await sendPortalEmail({
      to: client.email,
      subject: "Your Nielsen Innovations client portal is ready",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#111827;">
          <h2>Your client portal is ready</h2>
          <p>Hi ${escapeEmailHtml(client.contact)},</p>
          <p>Your Nielsen Innovations client portal account has been created.</p>
          <p><strong>Username:</strong> ${escapeEmailHtml(user.username)}</p>
          <p>For security, your temporary password is not included in this email. Please use the password provided to you separately, then update it after signing in.</p>
          <p><a href="${portalUrl("/login")}">Open the client portal</a></p>
        </div>
      `
    });

    return res.json({ ok: true, email });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to send account email"
    });
  }
});

router.post("/clients/:clientId/invoices/:invoiceId/email", async (req, res) => {
  try {
    const { client, invoice } = await loadClientAndInvoice(
      req.params.clientId,
      req.params.invoiceId
    );
    if (respondWithMissingRecord(res, client, invoice)) {
      return;
    }

    const email = await sendInvoiceMessage({
      client,
      invoice,
      subject: `Invoice ${invoice.number} from Nielsen Innovations`,
      message: "A new invoice is available in your client portal."
    });
    if (invoice.status === "draft") {
      invoice.status = "sent";
      await client.save();
    }
    return res.json({ ok: true, email, client: serializeClient(client) });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to send invoice email"
    });
  }
});

router.post("/clients/:clientId/invoices/:invoiceId/reminder", async (req, res) => {
  try {
    const { client, invoice } = await loadClientAndInvoice(
      req.params.clientId,
      req.params.invoiceId
    );
    if (respondWithMissingRecord(res, client, invoice)) {
      return;
    }

    const email = await sendInvoiceMessage({
      client,
      invoice,
      subject: `Reminder: invoice ${invoice.number} is due`,
      message: "This is a friendly reminder that this invoice is still awaiting payment."
    });
    return res.json({ ok: true, email });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to send reminder email"
    });
  }
});

router.post("/clients/:clientId/invoices/:invoiceId/receipt", async (req, res) => {
  try {
    const { client, invoice } = await loadClientAndInvoice(
      req.params.clientId,
      req.params.invoiceId
    );
    if (respondWithMissingRecord(res, client, invoice)) {
      return;
    }
    if (invoice.status !== "paid") {
      return res.status(400).json({
        error: "Mark the invoice paid before sending a receipt"
      });
    }

    const email = await sendInvoiceMessage({
      client,
      invoice,
      subject: `Receipt for invoice ${invoice.number}`,
      message: "Thanks, payment has been received for this invoice. This email is your receipt."
    });
    return res.json({ ok: true, email });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unable to send receipt email"
    });
  }
});

export default router;
