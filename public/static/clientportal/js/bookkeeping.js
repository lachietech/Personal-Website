import { BookkeepingImportController } from './bookkeeping/import-controller.js';
import { downloadCsv, reportTotals } from './bookkeeping/report-utils.js';

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

    const importController = new BookkeepingImportController({
        state,
        elements: els,
        defaultDebitAccount,
        defaultCreditAccount,
        escapeHtml,
        money,
        renderAll,
        setMessage
    });
    importController.initialize();
    loadBookkeeping().catch((error) => {
        panel.innerHTML = `<div class="empty-state"><h3>Unable to load bookkeeping</h3><p>${escapeHtml(error.message)}</p></div>`;
    });
})();
