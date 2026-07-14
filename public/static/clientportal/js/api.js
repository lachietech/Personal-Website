(function () {
    let csrfTokenPromise;

    function getCsrfToken() {
        if (!csrfTokenPromise) {
            csrfTokenPromise = fetch('/csrf-token', { credentials: 'same-origin' })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Unable to fetch CSRF token');
                    }
                    return response.json();
                })
                .then((data) => data.csrfToken);
        }

        return csrfTokenPromise;
    }

    async function request(path, options = {}) {
        const method = options.method || 'GET';
        const headers = { ...(options.headers || {}) };
        const requestOptions = {
            method,
            credentials: 'same-origin',
            headers
        };

        if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            headers['x-csrf-token'] = await getCsrfToken();
            requestOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(path, requestOptions);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    function money(value) {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(value || 0);
    }

    function formatDate(value) {
        if (!value) {
            return 'Not set';
        }

        return new Intl.DateTimeFormat('en-AU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(`${value}T00:00:00`));
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
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

    function amountOwing(client) {
        return client.invoices
            .filter((invoice) => invoice.status !== 'paid')
            .reduce((total, invoice) => total + invoiceTotal(invoice), 0);
    }

    function setMessage(element, message, type = '') {
        element.textContent = message;
        element.className = `form-message ${type}`.trim();
    }

    function printInvoice(container) {
        if (!container || container.querySelector('.empty-state')) {
            return false;
        }

        const cleanup = () => {
            window.removeEventListener('afterprint', cleanup);
            document.body.classList.remove('invoice-printing');
        };

        document.body.classList.add('invoice-printing');
        window.addEventListener('afterprint', cleanup, { once: true });
        window.print();
        window.setTimeout(cleanup, 5000);
        return true;
    }

    function renderBillingDetails(billing, invoice) {
        if (!billing) {
            return '';
        }

        return `
            <div class="billing-details">
                <div>
                    <p class="eyebrow">Business</p>
                    <h2>${escapeHtml(billing.businessName || 'Nielsen Innovations')}</h2>
                    <p><strong>ABN:</strong> ${escapeHtml(billing.abn || 'Not supplied')}</p>
                </div>
                <div>
                    <p class="eyebrow">Payment</p>
                    <p>
                        <strong>Bank:</strong> ${escapeHtml(billing.bankName || 'Not supplied')}<br>
                        <strong>Account name:</strong> ${escapeHtml(billing.accountName || 'Not supplied')}<br>
                        <strong>BSB:</strong> ${escapeHtml(billing.bsb || 'Not supplied')}<br>
                        <strong>Account number:</strong> ${escapeHtml(billing.accountNumber || 'Not supplied')}<br>
                        <strong>Reference:</strong> ${escapeHtml(billing.paymentReference || invoice.number)}
                    </p>
                    <p>${escapeHtml(billing.paymentTerms || '')}</p>
                </div>
            </div>
        `;
    }

    function renderInvoiceDetail(container, client, invoice, adminEditButton = false, billing = null) {
        if (!client || !invoice) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-receipt"></i>
                    <h3>No invoice selected</h3>
                    <p>Select an invoice to view itemised billing details.</p>
                </div>
            `;
            return;
        }

        const itemRows = invoice.items.map((item) => `
            <tr>
                <td>${escapeHtml(item.description)}</td>
                <td class="number-cell">${Number(item.quantity || 0).toLocaleString('en-AU')}</td>
                <td class="number-cell">${money(item.rate)}</td>
                <td class="number-cell">${money(Number(item.quantity || 0) * Number(item.rate || 0))}</td>
            </tr>
        `).join('');
        const hourRows = (invoice.hours || []).map((entry) => `
            <tr>
                <td>${formatDate(entry.date)}</td>
                <td class="number-cell">${Number(entry.hours || 0).toLocaleString('en-AU')}</td>
                <td>${escapeHtml(entry.work)}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="invoice-top">
                <div>
                    <p class="eyebrow">Invoice</p>
                    <h2>${escapeHtml(invoice.number)}</h2>
                </div>
                <div class="invoice-meta">
                    <span><strong>Client:</strong> ${escapeHtml(client.business)}</span>
                    <span><strong>Issued:</strong> ${formatDate(invoice.issued)}</span>
                    <span><strong>Due:</strong> ${formatDate(invoice.due)}</span>
                    <span class="status-pill status-${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span>
                    ${adminEditButton ? '<button class="action-button" type="button" id="loadInvoiceButton"><i class="bi bi-pencil-square"></i>Edit invoice</button>' : ''}
                </div>
            </div>
            ${renderBillingDetails(billing, invoice)}
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="number-cell">Qty</th>
                        <th class="number-cell">Rate</th>
                        <th class="number-cell">Amount</th>
                    </tr>
                </thead>
                <tbody>${itemRows || '<tr><td colspan="4">No line items yet.</td></tr>'}</tbody>
            </table>
            <table class="totals-table" aria-label="Invoice totals">
                <tr><td>Subtotal</td><td class="number-cell">${money(invoiceSubtotal(invoice))}</td></tr>
                <tr><td>GST ${Math.round(Number(invoice.taxRate || 0) * 100)}%</td><td class="number-cell">${money(invoiceTax(invoice))}</td></tr>
                <tr><td>Total</td><td class="number-cell">${money(invoiceTotal(invoice))}</td></tr>
            </table>
            <div class="hours-summary">
                <div class="panel-heading">
                    <div>
                        <p class="eyebrow">Hours</p>
                        <h2>${invoiceHours(invoice).toFixed(2)} total hours</h2>
                    </div>
                </div>
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th class="number-cell">Hours</th>
                            <th>Work completed</th>
                        </tr>
                    </thead>
                    <tbody>${hourRows || '<tr><td colspan="3">No hours recorded.</td></tr>'}</tbody>
                </table>
            </div>
            <div class="invoice-notes">
                <strong>Notes</strong>
                <p>${escapeHtml(invoice.notes || 'No notes added.')}</p>
            </div>
        `;
    }

    window.Portal = {
        request,
        csrfToken: getCsrfToken,
        money,
        formatDate,
        escapeHtml,
        invoiceTotal,
        invoiceHours,
        amountOwing,
        setMessage,
        printInvoice,
        renderInvoiceDetail
    };
})();
