import { dateOnly, getDate, getOptionalText, getRequiredText } from "./validation.js";

export const MAX_IMPORT_TRANSACTIONS = 500;

export const BOOKKEEPING_CATEGORIES = [
  "Client Income",
  "Software/Subscriptions",
  "Office Supplies",
  "Travel",
  "Meals",
  "Professional Services",
  "Equipment",
  "Marketing",
  "Bank Fees",
  "Taxes/Estimated Payments",
  "Uncategorized"
];

export const BOOKKEEPING_ACCOUNTS = [
  "Business Checking",
  "Business Savings",
  "Credit Card",
  "Cash",
  "PayPal/Stripe",
  "Accounts Receivable",
  ...BOOKKEEPING_CATEGORIES.slice(0, -1),
  "Owner Draw",
  "Other"
];

export function bookkeepingOwner(user) {
  return {
    ownerUserId: user.id,
    ownerClientId: user.role === "client" ? user.clientId : null
  };
}

export function bookkeepingOwnerQuery(user) {
  const owner = bookkeepingOwner(user);
  return owner.ownerClientId
    ? { ownerClientId: owner.ownerClientId }
    : { ownerUserId: owner.ownerUserId, ownerClientId: null };
}

export function serializeBookkeepingTransaction(transaction) {
  const debitAccount = transaction.debitAccount
    || (transaction.type === "income" ? transaction.account : transaction.category);
  const creditAccount = transaction.creditAccount
    || (transaction.type === "income" ? transaction.category : transaction.account);

  return {
    id: transaction._id.toString(),
    date: dateOnly(transaction.date),
    amount: transaction.amount,
    description: transaction.description,
    category: transaction.category || "",
    account: transaction.account || "",
    debitAccount: debitAccount || "",
    creditAccount: creditAccount || "",
    type: transaction.type,
    reviewed: Boolean(transaction.reviewed),
    source: transaction.source || "manual",
    importFingerprint: transaction.importFingerprint || "",
    receipt: transaction.receipt?.filename
      ? {
          filename: transaction.receipt.filename,
          uploadedAt: transaction.receipt.uploadedAt || null
        }
      : null
  };
}

export function serializeBookkeepingRule(rule) {
  return {
    id: rule._id.toString(),
    contains: rule.contains,
    category: rule.category,
    account: rule.account || ""
  };
}

export function getBookkeepingTransactionPayload(body, source = "manual") {
  const type = ["income", "expense"].includes(body?.type) ? body.type : "";
  if (!type) {
    throw new Error("Transaction type is required");
  }
  const amount = Math.max(0, Number(body?.amount || 0));
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const account = getOptionalText(body?.account, 120) || "Business Checking";
  const category = getOptionalText(body?.category, 120);
  return {
    date: getDate(body?.date, "Transaction date"),
    amount,
    description: getRequiredText(body?.description, "Description", 280),
    category,
    account,
    debitAccount: getOptionalText(body?.debitAccount, 120)
      || (type === "income" ? account : category || "Uncategorized"),
    creditAccount: getOptionalText(body?.creditAccount, 120)
      || (type === "income" ? category || "Client Income" : account),
    type,
    reviewed: Boolean(body?.reviewed),
    source,
    importFingerprint: getOptionalText(body?.importFingerprint, 220)
  };
}

export function getBookkeepingRulePayload(body) {
  return {
    contains: getRequiredText(body?.contains, "Rule text", 120).toLowerCase(),
    category: getRequiredText(body?.category, "Rule category", 120),
    account: getOptionalText(body?.account, 120)
  };
}
