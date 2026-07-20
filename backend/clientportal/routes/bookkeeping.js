import express from "express";
import { adminApiLimiter } from "../config.js";
import { requirePortalAdmin, requirePortalAuth } from "../middleware/auth.js";
import BookkeepingRule from "../models/BookkeepingRule.js";
import BookkeepingTransaction from "../models/BookkeepingTransaction.js";
import {
  BOOKKEEPING_ACCOUNTS,
  BOOKKEEPING_CATEGORIES,
  MAX_IMPORT_TRANSACTIONS,
  bookkeepingOwner,
  bookkeepingOwnerQuery,
  getBookkeepingRulePayload,
  getBookkeepingTransactionPayload,
  getOptionalText,
  getRequiredText,
  parseMultipartReceipt,
  serializeBookkeepingRule,
  serializeBookkeepingTransaction
} from "../helpers/portal-data.js";

const router = express.Router();
router.use(adminApiLimiter, requirePortalAuth, requirePortalAdmin);

function findOwnedTransaction(user, transactionId) {
  return BookkeepingTransaction.findOne({
    ...bookkeepingOwnerQuery(user),
    _id: transactionId
  });
}

async function listTransactions(user) {
  return BookkeepingTransaction.find(bookkeepingOwnerQuery(user))
    .sort({ date: -1, createdAt: -1 })
    .limit(2000);
}

router.get("/", async (req, res) => {
  const query = bookkeepingOwnerQuery(req.portalUser);
  const [transactions, rules] = await Promise.all([
    listTransactions(req.portalUser),
    BookkeepingRule.find(query).sort({ contains: 1 })
  ]);

  res.json({
    categories: BOOKKEEPING_CATEGORIES,
    accounts: BOOKKEEPING_ACCOUNTS,
    transactions: transactions.map(serializeBookkeepingTransaction),
    rules: rules.map(serializeBookkeepingRule)
  });
});

router.post("/transactions", async (req, res) => {
  try {
    const transaction = await BookkeepingTransaction.create({
      ...bookkeepingOwner(req.portalUser),
      ...getBookkeepingTransactionPayload(req.body, "manual")
    });
    res.status(201).json({
      transaction: serializeBookkeepingTransaction(transaction)
    });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to create transaction"
    });
  }
});

router.post("/transactions/bulk-categorize", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 500) : [];
    const category = getRequiredText(req.body?.category, "Category", 120);
    const account = getOptionalText(req.body?.account, 120);
    const transactions = await BookkeepingTransaction.find({
      ...bookkeepingOwnerQuery(req.portalUser),
      _id: { $in: ids }
    });

    await Promise.all(transactions.map((transaction) => {
      transaction.category = category;
      transaction.reviewed = req.body?.reviewed !== false;
      if (account) {
        transaction.account = account;
      }

      const moneyAccount = account || transaction.account || "Business Checking";
      transaction.debitAccount = transaction.type === "income"
        ? moneyAccount
        : category;
      transaction.creditAccount = transaction.type === "income"
        ? category
        : moneyAccount;
      return transaction.save();
    }));

    const updated = await listTransactions(req.portalUser);
    res.json({ transactions: updated.map(serializeBookkeepingTransaction) });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to update transactions"
    });
  }
});

router.post("/import", async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.transactions)
      ? req.body.transactions.slice(0, MAX_IMPORT_TRANSACTIONS)
      : [];
    const owner = bookkeepingOwner(req.portalUser);
    const query = bookkeepingOwnerQuery(req.portalUser);
    const fingerprints = rows
      .map((row) => getOptionalText(row?.importFingerprint, 220))
      .filter(Boolean);
    const existing = fingerprints.length
      ? await BookkeepingTransaction.find({
          ...query,
          importFingerprint: { $in: fingerprints }
        }).select("importFingerprint")
      : [];
    const existingFingerprints = new Set(
      existing.map((transaction) => transaction.importFingerprint)
    );
    const payloads = rows
      .map((row) => getBookkeepingTransactionPayload(row, "import"))
      .filter((row) => (
        !row.importFingerprint || !existingFingerprints.has(row.importFingerprint)
      ))
      .map((row) => ({
        ...owner,
        ...row,
        reviewed: false,
        source: "import"
      }));

    const inserted = payloads.length
      ? await BookkeepingTransaction.insertMany(payloads, { ordered: false })
      : [];
    const transactions = await listTransactions(req.portalUser);

    res.status(201).json({
      imported: inserted.length,
      skipped: rows.length - inserted.length,
      transactions: transactions.map(serializeBookkeepingTransaction)
    });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Unable to import transactions"
    });
  }
});

router.post("/rules", async (req, res) => {
  try {
    const payload = getBookkeepingRulePayload(req.body);
    const rule = await BookkeepingRule.findOneAndUpdate(
      {
        ...bookkeepingOwnerQuery(req.portalUser),
        contains: payload.contains
      },
      { $set: { ...bookkeepingOwner(req.portalUser), ...payload } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ rule: serializeBookkeepingRule(rule) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to save rule" });
  }
});

router.delete("/rules/:ruleId", async (req, res) => {
  const rule = await BookkeepingRule.findOne({
    ...bookkeepingOwnerQuery(req.portalUser),
    _id: req.params.ruleId
  });
  if (!rule) {
    return res.status(404).json({ error: "Rule not found" });
  }

  await BookkeepingRule.deleteOne({ _id: rule._id });
  return res.json({ ok: true });
});

router.put("/transactions/:transactionId", async (req, res) => {
  try {
    const transaction = await findOwnedTransaction(
      req.portalUser,
      req.params.transactionId
    );
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    Object.assign(
      transaction,
      getBookkeepingTransactionPayload(req.body, transaction.source || "manual")
    );
    await transaction.save();
    return res.json({
      transaction: serializeBookkeepingTransaction(transaction)
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to update transaction"
    });
  }
});

router.delete("/transactions/:transactionId", async (req, res) => {
  const transaction = await findOwnedTransaction(
    req.portalUser,
    req.params.transactionId
  );
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  await BookkeepingTransaction.deleteOne({ _id: transaction._id });
  return res.json({ ok: true });
});

router.post("/transactions/:transactionId/receipt", async (req, res) => {
  try {
    const transaction = await findOwnedTransaction(
      req.portalUser,
      req.params.transactionId
    );
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const receipt = await parseMultipartReceipt(req);
    transaction.receipt = {
      ...receipt,
      uploadedAt: new Date()
    };
    await transaction.save();
    return res.json({
      transaction: serializeBookkeepingTransaction(transaction)
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || "Unable to upload receipt"
    });
  }
});

router.get("/transactions/:transactionId/receipt", async (req, res) => {
  const transaction = await findOwnedTransaction(
    req.portalUser,
    req.params.transactionId
  );
  if (!transaction?.receipt?.data) {
    return res.status(404).json({ error: "Receipt not found" });
  }

  const filename = encodeURIComponent(transaction.receipt.filename || "receipt");
  res.setHeader(
    "Content-Type",
    transaction.receipt.contentType || "application/octet-stream"
  );
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  return res.send(transaction.receipt.data);
});

router.delete("/transactions/:transactionId/receipt", async (req, res) => {
  const transaction = await findOwnedTransaction(
    req.portalUser,
    req.params.transactionId
  );
  if (!transaction) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  transaction.receipt = {
    filename: "",
    contentType: "",
    data: null,
    uploadedAt: null
  };
  await transaction.save();
  return res.json({
    transaction: serializeBookkeepingTransaction(transaction)
  });
});

export default router;
