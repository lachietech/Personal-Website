(function () {
    const panel = document.getElementById('bookkeepingPanel');
    if (!panel) {
        return;
    }

    const state = {
        categories: [],
        accounts: [],
        transactions: [],
        rules: [],
        selectedIds: new Set(),
        csvHeaders: [],
        csvRows: [],
        importPreview: [],
        importSelected: new Set()
    };

    const els = {
        transactionForm: document.getElementById('bkTransactionForm'),
        transactionFormTitle: document.getElementById('bkTransactionFormTitle'),
        transactionId: document.getElementById('bkTransactionId'),
        date: document.getElementById('bkDate'),
        type: document.getElementById('bkType'),
        amount: document.getElementById('bkAmount'),
        account: document.getElementById('bkAccount'),
        debitAccount: document.getElementById('bkDebitAccount'),
        creditAccount: document.getElementById('bkCreditAccount'),
        description: document.getElementById('bkDescription'),
        category: document.getElementById('bkCategory'),
        receiptFile: document.getElementById('bkReceiptFile'),
        receiptStatus: document.getElementById('bkReceiptStatus'),
        reviewed: document.getElementById('bkReviewed'),
        resetTransaction: document.getElementById('bkResetTransaction'),
        deleteTransaction: document.getElementById('bkDeleteTransaction'),
        formMessage: document.getElementById('bkFormMessage'),
        transactionBody: document.getElementById('bkTransactionBody'),
        selectAll: document.getElementById('bkSelectAll'),
        filterStart: document.getElementById('bkFilterStart'),
        filterEnd: document.getElementById('bkFilterEnd'),
        filterCategory: document.getElementById('bkFilterCategory'),
        filterAccount: document.getElementById('bkFilterAccount'),
        filterType: document.getElementById('bkFilterType'),
        filterReviewed: document.getElementById('bkFilterReviewed'),
        bulkCategory: document.getElementById('bkBulkCategory'),
        bulkAccount: document.getElementById('bkBulkAccount'),
        bulkCategorize: document.getElementById('bkBulkCategorize'),
        categoryList: document.getElementById('bkCategoryList'),
        accountList: document.getElementById('bkAccountList'),
        csvFile: document.getElementById('bkCsvFile'),
        mappingGrid: document.getElementById('bkMappingGrid'),
        buildPreview: document.getElementById('bkBuildPreview'),
        commitImport: document.getElementById('bkCommitImport'),
        importSelectAll: document.getElementById('bkImportSelectAll'),
        importPreviewBody: document.getElementById('bkImportPreviewBody'),
        importMessage: document.getElementById('bkImportMessage'),
        ruleForm: document.getElementById('bkRuleForm'),
        ruleContains: document.getElementById('bkRuleContains'),
        ruleCategory: document.getElementById('bkRuleCategory'),
        ruleAccount: document.getElementById('bkRuleAccount'),
        ruleList: document.getElementById('bkRuleList'),
        summaryIncome: document.getElementById('bkSummaryIncome'),
        summaryExpenses: document.getElementById('bkSummaryExpenses'),
        summaryNet: document.getElementById('bkSummaryNet'),
        summaryRange: document.getElementById('bkSummaryRange'),
        summaryUnreviewed: document.getElementById('bkSummaryUnreviewed'),
        summaryCount: document.getElementById('bkSummaryCount'),
        exportTransactionsCsv: document.getElementById('bkExportTransactionsCsv'),
        reportArea: document.getElementById('bkReportArea'),
        reportPeriod: document.getElementById('bkReportPeriod'),
        reportYear: document.getElementById('bkReportYear'),
        reportStart: document.getElementById('bkReportStart'),
        reportEnd: document.getElementById('bkReportEnd'),
        reportSummary: document.getElementById('bkReportSummary'),
        expenseBreakdownBody: document.getElementById('bkExpenseBreakdownBody'),
        yearComparisonBody: document.getElementById('bkYearComparisonBody'),
        exportReportCsv: document.getElementById('bkExportReportCsv'),
        exportReportPdf: document.getElementById('bkExportReportPdf')
    };

    const mappingFields = [
        ['date', 'Date'],
        ['description', 'Description'],
        ['amount', 'Signed amount'],
        ['debit', 'Debit/withdrawal'],
        ['credit', 'Credit/deposit'],
        ['type', 'Type'],
        ['account', 'Account'],
        ['category', 'Category']
    ];

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function money(value) {
        return Portal.money(value || 0);
    }

    function escapeHtml(value) {
        return Portal.escapeHtml(value);
    }

    function setMessage(element, message, type = '') {
        Portal.setMessage(element, message, type);
    }

    function normalizeText(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function normalizeCompact(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    function cleanAmount(value) {
        const raw = String(value || '').trim();
        const negative = /^\(.*\)$/.test(raw) || raw.startsWith('-');
        const number = Number(raw.replace(/[()$,]/g, ''));
        if (!Number.isFinite(number)) {
            return 0;
        }
        return negative ? -Math.abs(number) : number;
    }

    function normalizeDate(value) {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
            const [year, month, day] = raw.split('-');
            return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
        if (slash) {
            const first = Number(slash[1]);
            const second = Number(slash[2]);
            const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
            const day = first > 12 ? first : second;
            const month = first > 12 ? second : first;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
    }

    function selectedTransaction() {
        return state.transactions.find((transaction) => transaction.id === els.transactionId.value) || null;
    }

    function defaultDebitAccount(type, account, category) {
        return type === 'income' ? account || 'Business Checking' : category || 'Uncategorized';
    }

    function defaultCreditAccount(type, account, category) {
        return type === 'income' ? category || 'Client Income' : account || 'Business Checking';
    }

    function syncEntryAccounts() {
        const type = els.type.value;
        const account = els.account.value || 'Business Checking';
        const category = els.category.value || (type === 'income' ? 'Client Income' : 'Uncategorized');
        if (!els.debitAccount.value || els.debitAccount.dataset.auto === 'true') {
            els.debitAccount.value = defaultDebitAccount(type, account, category);
            els.debitAccount.dataset.auto = 'true';
        }
        if (!els.creditAccount.value || els.creditAccount.dataset.auto === 'true') {
            els.creditAccount.value = defaultCreditAccount(type, account, category);
            els.creditAccount.dataset.auto = 'true';
        }
    }

    function activeFilters() {
        return {
            start: els.filterStart.value,
            end: els.filterEnd.value,
            category: els.filterCategory.value.trim().toLowerCase(),
            account: els.filterAccount.value.trim().toLowerCase(),
            type: els.filterType.value,
            reviewed: els.filterReviewed.value
        };
    }

    function filteredTransactions() {
        const filters = activeFilters();
        return state.transactions.filter((transaction) => {
            if (filters.start && transaction.date < filters.start) {
                return false;
            }
            if (filters.end && transaction.date > filters.end) {
                return false;
            }
            if (filters.category && String(transaction.category || '').toLowerCase() !== filters.category) {
                return false;
            }
            const accountText = [
                transaction.account,
                transaction.debitAccount,
                transaction.creditAccount
            ].join(' ').toLowerCase();
            if (filters.account && !accountText.includes(filters.account)) {
                return false;
            }
            if (filters.type && transaction.type !== filters.type) {
                return false;
            }
            if (filters.reviewed === 'reviewed' && !transaction.reviewed) {
                return false;
            }
            if (filters.reviewed === 'unreviewed' && transaction.reviewed) {
                return false;
            }
            return true;
        });
    }

    function renderOptions() {
        const categories = [...new Set([...state.categories, ...state.transactions.map((item) => item.category).filter(Boolean)])];
        const accounts = [...new Set([
            ...state.accounts,
            ...state.transactions.map((item) => item.account).filter(Boolean),
            ...state.transactions.map((item) => item.debitAccount).filter(Boolean),
            ...state.transactions.map((item) => item.creditAccount).filter(Boolean)
        ])];

        els.categoryList.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join('');
        els.accountList.innerHTML = accounts.map((account) => `<option value="${escapeHtml(account)}"></option>`).join('');
        els.bulkCategory.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
        els.bulkAccount.innerHTML = '<option value="">Keep account</option>' + accounts.map((account) => `<option value="${escapeHtml(account)}">${escapeHtml(account)}</option>`).join('');
    }

    function renderSummary() {
        const transactions = filteredTransactions();
        const income = transactions.filter((item) => item.type === 'income').reduce((total, item) => total + Number(item.amount || 0), 0);
        const expenses = transactions.filter((item) => item.type === 'expense').reduce((total, item) => total + Number(item.amount || 0), 0);
        const unreviewed = state.transactions.filter((item) => !item.reviewed).length;
        const filters = activeFilters();

        els.summaryIncome.textContent = money(income);
        els.summaryExpenses.textContent = money(expenses);
        els.summaryNet.textContent = money(income - expenses);
        els.summaryCount.textContent = `${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`;
        els.summaryUnreviewed.textContent = `${unreviewed} to review`;
        els.summaryRange.textContent = filters.start || filters.end ? `${filters.start || 'Start'} to ${filters.end || 'Today'}` : 'All dates';
    }

    function renderTransactions() {
        const transactions = filteredTransactions();
        if (!transactions.length) {
            els.transactionBody.innerHTML = '<tr><td colspan="10">No transactions found.</td></tr>';
            els.selectAll.checked = false;
            return;
        }

        els.transactionBody.innerHTML = transactions.map((transaction) => `
            <tr>
                <td><input type="checkbox" data-bk-select="${escapeHtml(transaction.id)}" ${state.selectedIds.has(transaction.id) ? 'checked' : ''} aria-label="Select transaction"></td>
                <td>${escapeHtml(transaction.date)}</td>
                <td>${escapeHtml(transaction.description)}</td>
                <td>${escapeHtml(transaction.debitAccount || '')}</td>
                <td>${escapeHtml(transaction.creditAccount || '')}</td>
                <td>${escapeHtml(transaction.type)}</td>
                <td class="number-cell">${money(transaction.amount)}</td>
                <td>${transaction.receipt ? `<a href="/clientportal/api/bookkeeping/transactions/${escapeHtml(transaction.id)}/receipt" target="_blank" rel="noopener">Open</a>` : '-'}</td>
                <td><span class="${transaction.reviewed ? 'reviewed' : 'needs-review'}">${transaction.reviewed ? 'Reviewed' : 'Needs review'}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="mini-button" type="button" data-bk-edit="${escapeHtml(transaction.id)}" title="Edit" aria-label="Edit"><i class="bi bi-pencil-square"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        els.selectAll.checked = transactions.length > 0 && transactions.every((transaction) => state.selectedIds.has(transaction.id));
    }

    function resetTransactionForm() {
        els.transactionFormTitle.textContent = 'Add transaction';
        els.transactionId.value = '';
        els.date.value = today();
        els.type.value = 'expense';
        els.amount.value = '';
        els.account.value = state.accounts[0] || 'Business Checking';
        els.debitAccount.value = 'Uncategorized';
        els.creditAccount.value = state.accounts[0] || 'Business Checking';
        els.debitAccount.dataset.auto = 'true';
        els.creditAccount.dataset.auto = 'true';
        els.description.value = '';
        els.category.value = '';
        els.receiptFile.value = '';
        els.receiptStatus.textContent = '';
        els.reviewed.checked = false;
        els.deleteTransaction.hidden = true;
        setMessage(els.formMessage, '');
    }

    function fillTransactionForm(transaction) {
        els.transactionFormTitle.textContent = 'Edit transaction';
        els.transactionId.value = transaction.id;
        els.date.value = transaction.date;
        els.type.value = transaction.type;
        els.amount.value = transaction.amount;
        els.account.value = transaction.account || state.accounts[0] || 'Business Checking';
        els.debitAccount.value = transaction.debitAccount || defaultDebitAccount(transaction.type, transaction.account, transaction.category);
        els.creditAccount.value = transaction.creditAccount || defaultCreditAccount(transaction.type, transaction.account, transaction.category);
        els.debitAccount.dataset.auto = 'false';
        els.creditAccount.dataset.auto = 'false';
        els.description.value = transaction.description;
        els.category.value = transaction.category || '';
        els.receiptFile.value = '';
        els.receiptStatus.innerHTML = transaction.receipt
            ? `Receipt stored: <a href="/clientportal/api/bookkeeping/transactions/${escapeHtml(transaction.id)}/receipt" target="_blank" rel="noopener">${escapeHtml(transaction.receipt.filename)}</a>`
            : 'No receipt stored.';
        els.reviewed.checked = transaction.reviewed;
        els.deleteTransaction.hidden = false;
        setMessage(els.formMessage, '');
    }

    function transactionPayload() {
        return {
            date: els.date.value,
            type: els.type.value,
            amount: Number(els.amount.value || 0),
            account: els.account.value,
            debitAccount: els.debitAccount.value,
            creditAccount: els.creditAccount.value,
            description: els.description.value,
            category: els.category.value,
            reviewed: els.reviewed.checked
        };
    }

    async function uploadReceipt(transactionId) {
        const file = els.receiptFile.files?.[0];
        if (!file) {
            return null;
        }
        if (file.size > 2 * 1024 * 1024) {
            throw new Error('Receipt file must be under 2MB.');
        }

        const form = new FormData();
        form.append('receipt', file);
        const response = await fetch(`/clientportal/api/bookkeeping/transactions/${transactionId}/receipt`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'x-csrf-token': await Portal.csrfToken()
            },
            body: form
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'Unable to upload receipt');
        }
        return data.transaction;
    }

    async function saveTransaction(event) {
        event.preventDefault();
        const id = els.transactionId.value;
        setMessage(els.formMessage, 'Saving transaction...');
        try {
            const data = await Portal.request(id ? `/clientportal/api/bookkeeping/transactions/${id}` : '/clientportal/api/bookkeeping/transactions', {
                method: id ? 'PUT' : 'POST',
                body: transactionPayload()
            });
            let savedTransaction = data.transaction;
            const uploadedTransaction = await uploadReceipt(savedTransaction.id);
            if (uploadedTransaction) {
                savedTransaction = uploadedTransaction;
            }
            const index = state.transactions.findIndex((item) => item.id === savedTransaction.id);
            if (index >= 0) {
                state.transactions[index] = savedTransaction;
            } else {
                state.transactions.unshift(savedTransaction);
            }
            state.transactions.sort((a, b) => b.date.localeCompare(a.date));
            resetTransactionForm();
            renderAll();
            setMessage(els.formMessage, 'Transaction saved.', 'success');
        } catch (error) {
            setMessage(els.formMessage, error.message, 'error');
        }
    }

    async function deleteTransaction() {
        const transaction = selectedTransaction();
        if (!transaction || !window.confirm(`Delete transaction "${transaction.description}"?`)) {
            return;
        }

        await Portal.request(`/clientportal/api/bookkeeping/transactions/${transaction.id}`, { method: 'DELETE', body: {} });
        state.transactions = state.transactions.filter((item) => item.id !== transaction.id);
        state.selectedIds.delete(transaction.id);
        resetTransactionForm();
        renderAll();
    }

    function parseCsv(text) {
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

    function guessColumn(field) {
        const tests = {
            date: [/date/, /posted/, /transaction/],
            description: [/description/, /details/, /merchant/, /memo/, /payee/],
            amount: [/^amount$/, /signed/, /value/],
            debit: [/debit/, /withdrawal/, /paid out/, /outflow/],
            credit: [/credit/, /deposit/, /paid in/, /inflow/],
            type: [/type/],
            account: [/account/],
            category: [/category/]
        };
        return state.csvHeaders.findIndex((header) => tests[field]?.some((test) => test.test(header.toLowerCase())));
    }

    function renderMapping() {
        const options = ['<option value="">None</option>']
            .concat(state.csvHeaders.map((header, index) => `<option value="${index}">${escapeHtml(header || `Column ${index + 1}`)}</option>`))
            .join('');
        els.mappingGrid.innerHTML = mappingFields.map(([field, label]) => {
            const guess = guessColumn(field);
            return `
                <label>${escapeHtml(label)}
                    <select data-bk-map="${escapeHtml(field)}">
                        ${options}
                    </select>
                </label>
            `.replace(`value="${guess}"`, `value="${guess}" selected`);
        }).join('');
    }

    function mappingValue(field) {
        const select = els.mappingGrid.querySelector(`[data-bk-map="${field}"]`);
        return select?.value === '' ? -1 : Number(select.value);
    }

    function rowValue(row, index) {
        return index >= 0 ? String(row[index] || '').trim() : '';
    }

    function applyRules(description) {
        const normalized = normalizeText(description);
        const rule = state.rules.find((item) => normalized.includes(normalizeText(item.contains)));
        return rule || null;
    }

    function importFingerprint(transaction) {
        return [
            transaction.date,
            transaction.type,
            Number(transaction.amount || 0).toFixed(2),
            normalizeCompact(transaction.description),
            normalizeCompact(transaction.debitAccount || ''),
            normalizeCompact(transaction.creditAccount || '')
        ].join('|').slice(0, 220);
    }

    function descriptionOverlap(a, b) {
        const left = new Set(normalizeText(a).split(' ').filter((word) => word.length > 2));
        const right = new Set(normalizeText(b).split(' ').filter((word) => word.length > 2));
        if (!left.size || !right.size) {
            return 0;
        }
        const shared = [...left].filter((word) => right.has(word)).length;
        return shared / Math.max(left.size, right.size);
    }

    function looksDuplicate(transaction) {
        const compact = normalizeCompact(transaction.description);
        return state.transactions.some((existing) => {
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

    function buildImportPreview() {
        if (!state.csvRows.length) {
            setMessage(els.importMessage, 'Choose a CSV file first.', 'error');
            return;
        }

        const indexes = {
            date: mappingValue('date'),
            description: mappingValue('description'),
            amount: mappingValue('amount'),
            debit: mappingValue('debit'),
            credit: mappingValue('credit'),
            type: mappingValue('type'),
            account: mappingValue('account'),
            category: mappingValue('category')
        };

        if (indexes.date < 0 || indexes.description < 0 || (indexes.amount < 0 && indexes.debit < 0 && indexes.credit < 0)) {
            setMessage(els.importMessage, 'Map date, description, and either amount or debit/credit columns.', 'error');
            return;
        }

        state.importSelected.clear();
        state.importPreview = state.csvRows.map((row, index) => {
            const signedAmount = cleanAmount(rowValue(row, indexes.amount));
            const debit = cleanAmount(rowValue(row, indexes.debit));
            const credit = cleanAmount(rowValue(row, indexes.credit));
            const typeText = rowValue(row, indexes.type).toLowerCase();
            let type = signedAmount < 0 || debit > 0 ? 'expense' : 'income';
            if (/expense|debit|withdraw|payment|purchase/.test(typeText)) {
                type = 'expense';
            }
            if (/income|credit|deposit|sale|revenue/.test(typeText)) {
                type = 'income';
            }

            const amount = indexes.amount >= 0 ? Math.abs(signedAmount) : Math.max(debit, credit);
            const description = rowValue(row, indexes.description);
            const rule = applyRules(description);
            const account = rowValue(row, indexes.account) || rule?.account || state.accounts[0] || 'Business Checking';
            const category = rowValue(row, indexes.category) || rule?.category || '';
            const transaction = {
                date: normalizeDate(rowValue(row, indexes.date)),
                description,
                type,
                amount,
                account,
                category,
                debitAccount: defaultDebitAccount(type, account, category || (type === 'income' ? 'Client Income' : 'Uncategorized')),
                creditAccount: defaultCreditAccount(type, account, category || (type === 'income' ? 'Client Income' : 'Uncategorized')),
                reviewed: false
            };
            transaction.importFingerprint = importFingerprint(transaction);
            const duplicate = looksDuplicate(transaction);
            const valid = Boolean(transaction.date && transaction.description && transaction.amount > 0);
            if (valid && !duplicate) {
                state.importSelected.add(String(index));
            }
            return { id: String(index), transaction, duplicate, valid };
        });

        renderImportPreview();
        setMessage(els.importMessage, `${state.importPreview.length} rows parsed. Duplicates are unchecked by default.`);
    }

    function renderImportPreview() {
        if (!state.importPreview.length) {
            els.importPreviewBody.innerHTML = '<tr><td colspan="7">No import preview yet.</td></tr>';
            els.commitImport.disabled = true;
            return;
        }

        els.importPreviewBody.innerHTML = state.importPreview.map((row) => `
            <tr>
                <td><input type="checkbox" data-bk-import-select="${escapeHtml(row.id)}" ${state.importSelected.has(row.id) ? 'checked' : ''} ${row.valid ? '' : 'disabled'} aria-label="Select import row"></td>
                <td>${escapeHtml(row.transaction.date || '-')}</td>
                <td>${escapeHtml(row.transaction.description || '-')}</td>
                <td>${escapeHtml(row.transaction.type)}</td>
                <td class="number-cell">${money(row.transaction.amount)}</td>
                <td>${escapeHtml(row.transaction.category || 'Uncategorized')}</td>
                <td>${row.duplicate ? '<span class="duplicate-flag">Duplicate?</span>' : row.valid ? 'Ready' : '<span class="needs-review">Invalid</span>'}</td>
            </tr>
        `).join('');
        els.importSelectAll.checked = state.importPreview.filter((row) => row.valid).every((row) => state.importSelected.has(row.id));
        els.commitImport.disabled = state.importSelected.size === 0;
    }

    async function commitImport() {
        const transactions = state.importPreview
            .filter((row) => state.importSelected.has(row.id) && row.valid)
            .map((row) => row.transaction);
        if (!transactions.length) {
            setMessage(els.importMessage, 'Select at least one valid row to import.', 'error');
            return;
        }

        setMessage(els.importMessage, 'Importing transactions...');
        try {
            const data = await Portal.request('/clientportal/api/bookkeeping/import', {
                method: 'POST',
                body: { transactions }
            });
            state.transactions = data.transactions || state.transactions;
            state.importPreview = [];
            state.importSelected.clear();
            renderAll();
            renderImportPreview();
            setMessage(els.importMessage, `Imported ${data.imported} transaction${data.imported === 1 ? '' : 's'}; skipped ${data.skipped}.`, 'success');
        } catch (error) {
            setMessage(els.importMessage, error.message, 'error');
        }
    }

    function renderRules() {
        if (!state.rules.length) {
            els.ruleList.innerHTML = '<p class="form-message">No rules yet.</p>';
            return;
        }

        els.ruleList.innerHTML = state.rules.map((rule) => `
            <div class="rule-item">
                <p><strong>${escapeHtml(rule.contains)}</strong> -> ${escapeHtml(rule.category)}${rule.account ? ` / ${escapeHtml(rule.account)}` : ''}</p>
                <button class="mini-button" type="button" data-bk-rule-delete="${escapeHtml(rule.id)}" title="Delete rule" aria-label="Delete rule"><i class="bi bi-trash3"></i></button>
            </div>
        `).join('');
    }

    async function saveRule(event) {
        event.preventDefault();
        try {
            const data = await Portal.request('/clientportal/api/bookkeeping/rules', {
                method: 'POST',
                body: {
                    contains: els.ruleContains.value,
                    category: els.ruleCategory.value,
                    account: els.ruleAccount.value
                }
            });
            state.rules = state.rules.filter((rule) => rule.id !== data.rule.id && rule.contains !== data.rule.contains);
            state.rules.push(data.rule);
            state.rules.sort((a, b) => a.contains.localeCompare(b.contains));
            els.ruleForm.reset();
            renderRules();
        } catch (error) {
            window.alert(error.message);
        }
    }

    function setReportRange() {
        const year = Number(els.reportYear.value || new Date().getFullYear());
        const period = els.reportPeriod.value;
        const ranges = {
            year: [`${year}-01-01`, `${year}-12-31`],
            q1: [`${year}-01-01`, `${year}-03-31`],
            q2: [`${year}-04-01`, `${year}-06-30`],
            q3: [`${year}-07-01`, `${year}-09-30`],
            q4: [`${year}-10-01`, `${year}-12-31`]
        };
        if (ranges[period]) {
            [els.reportStart.value, els.reportEnd.value] = ranges[period];
        }
    }

    function reportTransactions() {
        return state.transactions.filter((transaction) => {
            if (els.reportStart.value && transaction.date < els.reportStart.value) {
                return false;
            }
            if (els.reportEnd.value && transaction.date > els.reportEnd.value) {
                return false;
            }
            return true;
        });
    }

    function reportTotals(transactions) {
        const income = transactions.filter((item) => item.type === 'income').reduce((total, item) => total + Number(item.amount || 0), 0);
        const expenses = transactions.filter((item) => item.type === 'expense').reduce((total, item) => total + Number(item.amount || 0), 0);
        return { income, expenses, net: income - expenses };
    }

    function renderReports() {
        const transactions = reportTransactions();
        const totals = reportTotals(transactions);
        const expensesByCategory = new Map();
        transactions.filter((item) => item.type === 'expense').forEach((item) => {
            const category = item.category || 'Uncategorized';
            expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + Number(item.amount || 0));
        });

        els.reportSummary.innerHTML = `
            <div class="report-metric"><span>Income</span><strong>${money(totals.income)}</strong></div>
            <div class="report-metric"><span>Expenses</span><strong>${money(totals.expenses)}</strong></div>
            <div class="report-metric"><span>Net profit</span><strong>${money(totals.net)}</strong></div>
        `;
        els.expenseBreakdownBody.innerHTML = [...expensesByCategory.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([category, amount]) => `<tr><td>${escapeHtml(category)}</td><td class="number-cell">${money(amount)}</td></tr>`)
            .join('') || '<tr><td colspan="2">No expenses in this range.</td></tr>';

        const byYear = new Map();
        state.transactions.forEach((transaction) => {
            const year = transaction.date.slice(0, 4);
            const current = byYear.get(year) || { income: 0, expenses: 0 };
            current[transaction.type === 'income' ? 'income' : 'expenses'] += Number(transaction.amount || 0);
            byYear.set(year, current);
        });
        els.yearComparisonBody.innerHTML = [...byYear.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([year, values]) => `<tr><td>${year}</td><td class="number-cell">${money(values.income)}</td><td class="number-cell">${money(values.expenses)}</td><td class="number-cell">${money(values.income - values.expenses)}</td></tr>`)
            .join('') || '<tr><td colspan="4">No yearly data yet.</td></tr>';
    }

    function csvEscape(value) {
        const text = String(value ?? '');
        return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }

    function downloadCsv(filename, rows) {
        const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function exportTransactionsCsv() {
        const rows = [
            ['Date', 'Description', 'Debit Account', 'Credit Account', 'Category', 'Money Account', 'Type', 'Amount', 'Receipt', 'Reviewed', 'Source'],
            ...filteredTransactions().map((transaction) => [
                transaction.date,
                transaction.description,
                transaction.debitAccount,
                transaction.creditAccount,
                transaction.category || 'Uncategorized',
                transaction.account,
                transaction.type,
                transaction.amount,
                transaction.receipt?.filename || '',
                transaction.reviewed ? 'Reviewed' : 'Needs review',
                transaction.source
            ])
        ];
        downloadCsv('bookkeeping-transactions.csv', rows);
    }

    function exportReportCsv() {
        const transactions = reportTransactions();
        const totals = reportTotals(transactions);
        const expenseRows = {};
        transactions.filter((item) => item.type === 'expense').forEach((item) => {
            const category = item.category || 'Uncategorized';
            expenseRows[category] = (expenseRows[category] || 0) + Number(item.amount || 0);
        });
        const rows = [
            ['Profit and Loss', `${els.reportStart.value} to ${els.reportEnd.value}`],
            ['Income', totals.income],
            ['Expenses', totals.expenses],
            ['Net Profit', totals.net],
            [],
            ['Expense Category', 'Amount'],
            ...Object.entries(expenseRows).sort((a, b) => b[1] - a[1])
        ];
        downloadCsv('bookkeeping-report.csv', rows);
    }

    function printReportPdf() {
        const cleanup = () => {
            window.removeEventListener('afterprint', cleanup);
            document.body.classList.remove('report-printing');
        };
        document.body.classList.add('report-printing');
        window.addEventListener('afterprint', cleanup, { once: true });
        window.print();
        window.setTimeout(cleanup, 5000);
    }

    async function bulkCategorize() {
        const ids = [...state.selectedIds];
        if (!ids.length) {
            return;
        }

        const data = await Portal.request('/clientportal/api/bookkeeping/transactions/bulk-categorize', {
            method: 'POST',
            body: {
                ids,
                category: els.bulkCategory.value,
                account: els.bulkAccount.value,
                reviewed: true
            }
        });
        state.transactions = data.transactions;
        state.selectedIds.clear();
        renderAll();
    }

    function renderAll() {
        renderOptions();
        renderSummary();
        renderTransactions();
        renderRules();
        renderReports();
    }

    async function loadBookkeeping() {
        const data = await Portal.request('/clientportal/api/bookkeeping');
        state.categories = data.categories || [];
        state.accounts = data.accounts || [];
        state.transactions = data.transactions || [];
        state.rules = data.rules || [];
        resetTransactionForm();
        renderAll();
    }

    els.transactionForm.addEventListener('submit', saveTransaction);
    els.resetTransaction.addEventListener('click', resetTransactionForm);
    els.deleteTransaction.addEventListener('click', deleteTransaction);
    [els.type, els.account, els.category].forEach((input) => {
        input.addEventListener('input', syncEntryAccounts);
    });
    [els.debitAccount, els.creditAccount].forEach((input) => {
        input.addEventListener('input', () => {
            input.dataset.auto = 'false';
        });
    });
    els.transactionBody.addEventListener('click', (event) => {
        const editButton = event.target.closest('[data-bk-edit]');
        if (editButton) {
            const transaction = state.transactions.find((item) => item.id === editButton.dataset.bkEdit);
            if (transaction) {
                fillTransactionForm(transaction);
            }
            return;
        }
        const checkbox = event.target.closest('[data-bk-select]');
        if (checkbox) {
            if (checkbox.checked) {
                state.selectedIds.add(checkbox.dataset.bkSelect);
            } else {
                state.selectedIds.delete(checkbox.dataset.bkSelect);
            }
            renderTransactions();
        }
    });
    els.selectAll.addEventListener('change', () => {
        filteredTransactions().forEach((transaction) => {
            if (els.selectAll.checked) {
                state.selectedIds.add(transaction.id);
            } else {
                state.selectedIds.delete(transaction.id);
            }
        });
        renderTransactions();
    });
    [els.filterStart, els.filterEnd, els.filterCategory, els.filterAccount, els.filterType, els.filterReviewed].forEach((input) => {
        input.addEventListener('input', () => {
            renderSummary();
            renderTransactions();
        });
    });
    els.bulkCategorize.addEventListener('click', () => {
        bulkCategorize().catch((error) => window.alert(error.message));
    });
    els.csvFile.addEventListener('change', async () => {
        const file = els.csvFile.files?.[0];
        if (!file) {
            return;
        }
        const rows = parseCsv(await file.text());
        state.csvHeaders = rows[0] || [];
        state.csvRows = rows.slice(1);
        state.importPreview = [];
        state.importSelected.clear();
        renderMapping();
        renderImportPreview();
        setMessage(els.importMessage, `${state.csvRows.length} CSV rows loaded.`);
    });
    els.buildPreview.addEventListener('click', buildImportPreview);
    els.commitImport.addEventListener('click', commitImport);
    els.importPreviewBody.addEventListener('change', (event) => {
        const checkbox = event.target.closest('[data-bk-import-select]');
        if (!checkbox) {
            return;
        }
        if (checkbox.checked) {
            state.importSelected.add(checkbox.dataset.bkImportSelect);
        } else {
            state.importSelected.delete(checkbox.dataset.bkImportSelect);
        }
        renderImportPreview();
    });
    els.importSelectAll.addEventListener('change', () => {
        state.importPreview.filter((row) => row.valid).forEach((row) => {
            if (els.importSelectAll.checked) {
                state.importSelected.add(row.id);
            } else {
                state.importSelected.delete(row.id);
            }
        });
        renderImportPreview();
    });
    els.ruleForm.addEventListener('submit', saveRule);
    els.ruleList.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-bk-rule-delete]');
        if (!button) {
            return;
        }
        await Portal.request(`/clientportal/api/bookkeeping/rules/${button.dataset.bkRuleDelete}`, { method: 'DELETE', body: {} });
        state.rules = state.rules.filter((rule) => rule.id !== button.dataset.bkRuleDelete);
        renderRules();
    });
    els.reportYear.value = new Date().getFullYear();
    setReportRange();
    [els.reportPeriod, els.reportYear].forEach((input) => input.addEventListener('input', () => {
        setReportRange();
        renderReports();
    }));
    [els.reportStart, els.reportEnd].forEach((input) => input.addEventListener('input', () => {
        els.reportPeriod.value = 'custom';
        renderReports();
    }));
    els.exportTransactionsCsv.addEventListener('click', exportTransactionsCsv);
    els.exportReportCsv.addEventListener('click', exportReportCsv);
    els.exportReportPdf.addEventListener('click', printReportPdf);

    renderMapping();
    renderImportPreview();
    loadBookkeeping().catch((error) => {
        panel.innerHTML = `<div class="empty-state"><h3>Unable to load bookkeeping</h3><p>${escapeHtml(error.message)}</p></div>`;
    });
})();
