import {
    cleanAmount,
    guessColumn,
    importFingerprint,
    looksDuplicate,
    normalizeDate,
    normalizeText,
    parseCsv
} from './import-utils.js';

const MAPPING_FIELDS = [
    ['date', 'Date'],
    ['description', 'Description'],
    ['amount', 'Signed amount'],
    ['debit', 'Debit/withdrawal'],
    ['credit', 'Credit/deposit'],
    ['type', 'Type'],
    ['account', 'Account'],
    ['category', 'Category']
];

export class BookkeepingImportController {
    constructor({
        state,
        elements,
        defaultDebitAccount,
        defaultCreditAccount,
        escapeHtml,
        money,
        renderAll,
        setMessage
    }) {
        this.state = state;
        this.elements = elements;
        this.defaultDebitAccount = defaultDebitAccount;
        this.defaultCreditAccount = defaultCreditAccount;
        this.escapeHtml = escapeHtml;
        this.money = money;
        this.renderAll = renderAll;
        this.setMessage = setMessage;
    }

    initialize() {
        const els = this.elements;
        els.csvFile.addEventListener('change', () => this.loadFile());
        els.buildPreview.addEventListener('click', () => this.buildPreview());
        els.commitImport.addEventListener('click', () => this.commit());
        els.importPreviewBody.addEventListener('change', (event) => {
            this.toggleRow(event);
        });
        els.importSelectAll.addEventListener('change', () => {
            this.toggleAllRows();
        });

        this.renderMapping();
        this.renderPreview();
    }

    async loadFile() {
        const file = this.elements.csvFile.files?.[0];
        if (!file) {
            return;
        }

        const rows = parseCsv(await file.text());
        this.state.csvHeaders = rows[0] || [];
        this.state.csvRows = rows.slice(1);
        this.state.importPreview = [];
        this.state.importSelected.clear();
        this.renderMapping();
        this.renderPreview();
        this.setMessage(
            this.elements.importMessage,
            `${this.state.csvRows.length} CSV rows loaded.`
        );
    }

    renderMapping() {
        const options = ['<option value="">None</option>']
            .concat(this.state.csvHeaders.map((header, index) => (
                `<option value="${index}">${this.escapeHtml(header || `Column ${index + 1}`)}</option>`
            )))
            .join('');

        this.elements.mappingGrid.innerHTML = MAPPING_FIELDS.map(([field, label]) => {
            const guess = guessColumn(this.state.csvHeaders, field);
            return `
                <label>${this.escapeHtml(label)}
                    <select data-bk-map="${this.escapeHtml(field)}">
                        ${options}
                    </select>
                </label>
            `.replace(`value="${guess}"`, `value="${guess}" selected`);
        }).join('');
    }

    mappingValue(field) {
        const select = this.elements.mappingGrid.querySelector(
            `[data-bk-map="${field}"]`
        );
        return select?.value === '' ? -1 : Number(select.value);
    }

    rowValue(row, index) {
        return index >= 0 ? String(row[index] || '').trim() : '';
    }

    applyRules(description) {
        const normalized = normalizeText(description);
        return this.state.rules.find((rule) => (
            normalized.includes(normalizeText(rule.contains))
        )) || null;
    }

    buildPreview() {
        if (!this.state.csvRows.length) {
            this.setMessage(
                this.elements.importMessage,
                'Choose a CSV file first.',
                'error'
            );
            return;
        }

        const indexes = Object.fromEntries(
            MAPPING_FIELDS.map(([field]) => [field, this.mappingValue(field)])
        );
        if (
            indexes.date < 0
            || indexes.description < 0
            || (indexes.amount < 0 && indexes.debit < 0 && indexes.credit < 0)
        ) {
            this.setMessage(
                this.elements.importMessage,
                'Map date, description, and either amount or debit/credit columns.',
                'error'
            );
            return;
        }

        this.state.importSelected.clear();
        this.state.importPreview = this.state.csvRows.map((row, index) => (
            this.createPreviewRow(row, index, indexes)
        ));
        this.renderPreview();
        this.setMessage(
            this.elements.importMessage,
            `${this.state.importPreview.length} rows parsed. Duplicates are unchecked by default.`
        );
    }

    createPreviewRow(row, index, indexes) {
        const signedAmount = cleanAmount(this.rowValue(row, indexes.amount));
        const debit = cleanAmount(this.rowValue(row, indexes.debit));
        const credit = cleanAmount(this.rowValue(row, indexes.credit));
        const typeText = this.rowValue(row, indexes.type).toLowerCase();
        let type = signedAmount < 0 || debit > 0 ? 'expense' : 'income';
        if (/expense|debit|withdraw|payment|purchase/.test(typeText)) {
            type = 'expense';
        }
        if (/income|credit|deposit|sale|revenue/.test(typeText)) {
            type = 'income';
        }

        const amount = indexes.amount >= 0
            ? Math.abs(signedAmount)
            : Math.max(debit, credit);
        const description = this.rowValue(row, indexes.description);
        const rule = this.applyRules(description);
        const account = this.rowValue(row, indexes.account)
            || rule?.account
            || this.state.accounts[0]
            || 'Business Checking';
        const category = this.rowValue(row, indexes.category)
            || rule?.category
            || '';
        const fallbackCategory = category
            || (type === 'income' ? 'Client Income' : 'Uncategorized');
        const transaction = {
            date: normalizeDate(this.rowValue(row, indexes.date)),
            description,
            type,
            amount,
            account,
            category,
            debitAccount: this.defaultDebitAccount(type, account, fallbackCategory),
            creditAccount: this.defaultCreditAccount(type, account, fallbackCategory),
            reviewed: false
        };
        transaction.importFingerprint = importFingerprint(transaction);

        const duplicate = looksDuplicate(transaction, this.state.transactions);
        const valid = Boolean(
            transaction.date && transaction.description && transaction.amount > 0
        );
        const id = String(index);
        if (valid && !duplicate) {
            this.state.importSelected.add(id);
        }
        return { id, transaction, duplicate, valid };
    }

    renderPreview() {
        const els = this.elements;
        if (!this.state.importPreview.length) {
            els.importPreviewBody.innerHTML =
                '<tr><td colspan="7">No import preview yet.</td></tr>';
            els.commitImport.disabled = true;
            return;
        }

        els.importPreviewBody.innerHTML = this.state.importPreview.map((row) => `
            <tr>
                <td><input type="checkbox" data-bk-import-select="${this.escapeHtml(row.id)}" ${this.state.importSelected.has(row.id) ? 'checked' : ''} ${row.valid ? '' : 'disabled'} aria-label="Select import row"></td>
                <td>${this.escapeHtml(row.transaction.date || '-')}</td>
                <td>${this.escapeHtml(row.transaction.description || '-')}</td>
                <td>${this.escapeHtml(row.transaction.type)}</td>
                <td class="number-cell">${this.money(row.transaction.amount)}</td>
                <td>${this.escapeHtml(row.transaction.category || 'Uncategorized')}</td>
                <td>${row.duplicate ? '<span class="duplicate-flag">Duplicate?</span>' : row.valid ? 'Ready' : '<span class="needs-review">Invalid</span>'}</td>
            </tr>
        `).join('');
        const validRows = this.state.importPreview.filter((row) => row.valid);
        els.importSelectAll.checked = validRows.length > 0
            && validRows.every((row) => this.state.importSelected.has(row.id));
        els.commitImport.disabled = this.state.importSelected.size === 0;
    }

    toggleRow(event) {
        const checkbox = event.target.closest('[data-bk-import-select]');
        if (!checkbox) {
            return;
        }
        if (checkbox.checked) {
            this.state.importSelected.add(checkbox.dataset.bkImportSelect);
        } else {
            this.state.importSelected.delete(checkbox.dataset.bkImportSelect);
        }
        this.renderPreview();
    }

    toggleAllRows() {
        this.state.importPreview.filter((row) => row.valid).forEach((row) => {
            if (this.elements.importSelectAll.checked) {
                this.state.importSelected.add(row.id);
            } else {
                this.state.importSelected.delete(row.id);
            }
        });
        this.renderPreview();
    }

    async commit() {
        const transactions = this.state.importPreview
            .filter((row) => this.state.importSelected.has(row.id) && row.valid)
            .map((row) => row.transaction);
        if (!transactions.length) {
            this.setMessage(
                this.elements.importMessage,
                'Select at least one valid row to import.',
                'error'
            );
            return;
        }

        this.setMessage(this.elements.importMessage, 'Importing transactions...');
        try {
            const data = await Portal.request('/clientportal/api/bookkeeping/import', {
                method: 'POST',
                body: { transactions }
            });
            this.state.transactions = data.transactions || this.state.transactions;
            this.state.importPreview = [];
            this.state.importSelected.clear();
            this.renderAll();
            this.renderPreview();
            this.setMessage(
                this.elements.importMessage,
                `Imported ${data.imported} transaction${data.imported === 1 ? '' : 's'}; skipped ${data.skipped}.`,
                'success'
            );
        } catch (error) {
            this.setMessage(this.elements.importMessage, error.message, 'error');
        }
    }
}
