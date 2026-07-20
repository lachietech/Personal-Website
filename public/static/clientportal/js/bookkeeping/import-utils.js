const COLUMN_PATTERNS = {
    date: [/date/, /posted/, /transaction/],
    description: [/description/, /details/, /merchant/, /memo/, /payee/],
    amount: [/^amount$/, /signed/, /value/],
    debit: [/debit/, /withdrawal/, /paid out/, /outflow/],
    credit: [/credit/, /deposit/, /paid in/, /inflow/],
    type: [/type/],
    account: [/account/],
    category: [/category/]
};

export function normalizeText(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeCompact(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function cleanAmount(value) {
    const raw = String(value || '').trim();
    const negative = /^\(.*\)$/.test(raw) || raw.startsWith('-');
    const number = Number(raw.replace(/[()$,]/g, ''));
    if (!Number.isFinite(number)) {
        return 0;
    }
    return negative ? -Math.abs(number) : number;
}

export function normalizeDate(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return '';
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
        const [year, month, day] = raw.split('-');
        return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const slashDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (slashDate) {
        const first = Number(slashDate[1]);
        const second = Number(slashDate[2]);
        const year = slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3];
        const day = first > 12 ? first : second;
        const month = first > 12 ? second : first;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

export function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];
        if (char === '"' && inQuotes && next === '"') {
            cell += '"';
            index += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(cell);
            cell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') {
                index += 1;
            }
            row.push(cell);
            if (row.some((value) => value.trim())) {
                rows.push(row);
            }
            row = [];
            cell = '';
        } else {
            cell += char;
        }
    }

    row.push(cell);
    if (row.some((value) => value.trim())) {
        rows.push(row);
    }
    return rows;
}

export function guessColumn(headers, field) {
    return headers.findIndex((header) => (
        COLUMN_PATTERNS[field]?.some((pattern) => pattern.test(header.toLowerCase()))
    ));
}

export function importFingerprint(transaction) {
    return [
        transaction.date,
        transaction.type,
        Number(transaction.amount || 0).toFixed(2),
        normalizeCompact(transaction.description),
        normalizeCompact(transaction.debitAccount || ''),
        normalizeCompact(transaction.creditAccount || '')
    ].join('|').slice(0, 220);
}

function descriptionOverlap(leftDescription, rightDescription) {
    const left = new Set(
        normalizeText(leftDescription).split(' ').filter((word) => word.length > 2)
    );
    const right = new Set(
        normalizeText(rightDescription).split(' ').filter((word) => word.length > 2)
    );
    if (!left.size || !right.size) {
        return 0;
    }
    const shared = [...left].filter((word) => right.has(word)).length;
    return shared / Math.max(left.size, right.size);
}

export function looksDuplicate(transaction, existingTransactions) {
    const compact = normalizeCompact(transaction.description);
    return existingTransactions.some((existing) => {
        if (existing.date !== transaction.date || existing.type !== transaction.type) {
            return false;
        }
        if (Math.abs(Number(existing.amount || 0) - Number(transaction.amount || 0)) > 0.01) {
            return false;
        }

        const existingCompact = normalizeCompact(existing.description);
        return compact === existingCompact
            || (compact.length > 6 && existingCompact.includes(compact))
            || (existingCompact.length > 6 && compact.includes(existingCompact))
            || descriptionOverlap(transaction.description, existing.description) >= 0.6;
    });
}
