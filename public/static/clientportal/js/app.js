const STORAGE_KEY = 'nielsen-client-portal-data';

const starterClients = [
    {
        id: 'client-nielsen-demo',
        business: 'Nielsen Innovations Demo Client',
        contact: 'Alex Taylor',
        email: 'alex@example.com',
        notes: 'Replace this demo account with a real client record when ready.',
        invoices: [
            {
                id: 'invoice-ni-1042',
                number: 'NI-1042',
                status: 'sent',
                issued: '2026-07-01',
                due: '2026-07-15',
                taxRate: 0.1,
                notes: 'Website refresh milestone invoice. No payment is processed through this portal.',
                items: [
                    { description: 'Homepage UI refresh', quantity: 8, rate: 55 },
                    { description: 'Client portal prototype setup', quantity: 6, rate: 55 },
                    { description: 'Deployment review and handover', quantity: 2, rate: 55 }
                ]
            },
            {
                id: 'invoice-ni-1037',
                number: 'NI-1037',
                status: 'paid',
                issued: '2026-06-03',
                due: '2026-06-17',
                taxRate: 0.1,
                notes: 'Initial discovery and planning.',
                items: [
                    { description: 'Project scoping session', quantity: 2, rate: 60 },
                    { description: 'Technical planning document', quantity: 3, rate: 60 }
                ]
            }
        ]
    },
    {
        id: 'client-harbour',
        business: 'Harbour Community Studio',
        contact: 'Mia Roberts',
        email: 'mia@example.com',
        notes: 'Monthly maintenance client.',
        invoices: [
            {
                id: 'invoice-ni-1040',
                number: 'NI-1040',
                status: 'overdue',
                issued: '2026-06-11',
                due: '2026-06-25',
                taxRate: 0.1,
                notes: 'Maintenance and small feature changes for June.',
                items: [
                    { description: 'Content updates', quantity: 4, rate: 50 },
                    { description: 'Bug fixes and browser checks', quantity: 3, rate: 50 },
                    { description: 'Monthly hosting support', quantity: 1, rate: 35 }
                ]
            }
        ]
    }
];

const state = {
    clients: loadClients(),
    mode: 'client',
    selectedClientId: null,
    selectedInvoiceId: null,
    search: ''
};

const els = {
    body: document.body,
    totalOwing: document.getElementById('totalOwing'),
    nextDue: document.getElementById('nextDue'),
    openInvoices: document.getElementById('openInvoices'),
    paidInvoices: document.getElementById('paidInvoices'),
    currentClientName: document.getElementById('currentClientName'),
    currentClientEmail: document.getElementById('currentClientEmail'),
    clientSearch: document.getElementById('clientSearch'),
    clientList: document.getElementById('clientList'),
    invoiceList: document.getElementById('invoiceList'),
    invoiceDetail: document.getElementById('invoiceDetail'),
    invoicePanelTitle: document.getElementById('invoicePanelTitle'),
    addClientButton: document.getElementById('addClientButton'),
    addInvoiceButton: document.getElementById('addInvoiceButton'),
    printInvoiceButton: document.getElementById('printInvoiceButton'),
    clientDialog: document.getElementById('clientDialog'),
    clientForm: document.getElementById('clientForm'),
    clientDialogTitle: document.getElementById('clientDialogTitle'),
    clientId: document.getElementById('clientId'),
    clientBusiness: document.getElementById('clientBusiness'),
    clientContact: document.getElementById('clientContact'),
    clientEmail: document.getElementById('clientEmail'),
    clientNotes: document.getElementById('clientNotes'),
    deleteClientButton: document.getElementById('deleteClientButton'),
    invoiceDialog: document.getElementById('invoiceDialog'),
    invoiceForm: document.getElementById('invoiceForm'),
    invoiceDialogTitle: document.getElementById('invoiceDialogTitle'),
    invoiceId: document.getElementById('invoiceId'),
    invoiceNumber: document.getElementById('invoiceNumber'),
    invoiceStatus: document.getElementById('invoiceStatus'),
    invoiceIssued: document.getElementById('invoiceIssued'),
    invoiceDue: document.getElementById('invoiceDue'),
    invoiceNotes: document.getElementById('invoiceNotes'),
    addLineButton: document.getElementById('addLineButton'),
    lineItemsEditor: document.getElementById('lineItemsEditor'),
    lineItemTemplate: document.getElementById('lineItemTemplate'),
    deleteInvoiceButton: document.getElementById('deleteInvoiceButton')
};

function loadClients() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : structuredClone(starterClients);
    } catch (error) {
        return structuredClone(starterClients);
    }
}

function saveClients() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
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

function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function selectedClient() {
    return state.clients.find((client) => client.id === state.selectedClientId) || state.clients[0] || null;
}

function selectedInvoice() {
    const client = selectedClient();
    if (!client) {
        return null;
    }

    return client.invoices.find((invoice) => invoice.id === state.selectedInvoiceId) || client.invoices[0] || null;
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

function amountOwing(client) {
    return client.invoices
        .filter((invoice) => invoice.status !== 'paid')
        .reduce((total, invoice) => total + invoiceTotal(invoice), 0);
}

function filteredClients() {
    const search = state.search.trim().toLowerCase();
    if (!search) {
        return state.clients;
    }

    return state.clients.filter((client) => {
        return [client.business, client.contact, client.email]
            .join(' ')
            .toLowerCase()
            .includes(search);
    });
}

function ensureSelection() {
    const client = selectedClient();
    state.selectedClientId = client?.id || null;

    const invoice = selectedInvoice();
    state.selectedInvoiceId = invoice?.id || null;
}

function renderSummary() {
    const client = selectedClient();
    if (!client) {
        els.totalOwing.textContent = money(0);
        els.nextDue.textContent = 'No clients yet';
        els.openInvoices.textContent = '0';
        els.paidInvoices.textContent = '0 paid invoices';
        els.currentClientName.textContent = '-';
        els.currentClientEmail.textContent = '-';
        return;
    }

    const open = client.invoices.filter((invoice) => invoice.status !== 'paid');
    const paid = client.invoices.filter((invoice) => invoice.status === 'paid');
    const nextDue = [...open].sort((a, b) => a.due.localeCompare(b.due))[0];

    els.totalOwing.textContent = money(amountOwing(client));
    els.nextDue.textContent = nextDue ? `Next due ${formatDate(nextDue.due)}` : 'All invoices paid';
    els.openInvoices.textContent = String(open.length);
    els.paidInvoices.textContent = `${paid.length} paid invoice${paid.length === 1 ? '' : 's'}`;
    els.currentClientName.textContent = client.business;
    els.currentClientEmail.textContent = client.email;
}

function renderClients() {
    const clients = filteredClients();
    els.clientList.textContent = '';

    if (!clients.length) {
        els.clientList.innerHTML = '<div class="empty-state"><h3>No clients found</h3><p>Try another search or add a client.</p></div>';
        return;
    }

    clients.forEach((client) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `client-card${client.id === state.selectedClientId ? ' active' : ''}`;
        button.dataset.clientId = client.id;
        button.innerHTML = `
            <strong>${escapeHtml(client.business)}</strong>
            <span>${escapeHtml(client.contact)} - ${escapeHtml(client.email)}</span>
            <div class="client-card-footer">
                <span>${money(amountOwing(client))} owing</span>
                ${state.mode === 'admin' ? '<i class="bi bi-pencil-square" data-edit-client title="Edit client"></i>' : ''}
            </div>
        `;
        els.clientList.appendChild(button);
    });
}

function renderInvoices() {
    const client = selectedClient();
    els.invoiceList.textContent = '';

    if (!client) {
        els.invoicePanelTitle.textContent = 'Select a client';
        return;
    }

    els.invoicePanelTitle.textContent = client.business;

    if (!client.invoices.length) {
        els.invoiceList.innerHTML = '<div class="empty-state"><h3>No invoices yet</h3><p>Add the first invoice for this client.</p></div>';
        return;
    }

    client.invoices.forEach((invoice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `invoice-card${invoice.id === state.selectedInvoiceId ? ' active' : ''}`;
        button.dataset.invoiceId = invoice.id;
        button.innerHTML = `
            <strong>${escapeHtml(invoice.number)}</strong>
            <span>Due ${formatDate(invoice.due)}</span>
            <div class="invoice-card-footer">
                <span>${money(invoiceTotal(invoice))}</span>
                <span class="status-pill status-${escapeHtml(invoice.status)}">${escapeHtml(invoice.status)}</span>
            </div>
        `;
        els.invoiceList.appendChild(button);
    });
}

function renderInvoiceDetail() {
    const client = selectedClient();
    const invoice = selectedInvoice();

    if (!client || !invoice) {
        els.invoiceDetail.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-receipt"></i>
                <h3>No invoice selected</h3>
                <p>Choose a client and invoice to view itemised billing details.</p>
            </div>
        `;
        return;
    }

    const subtotal = invoiceSubtotal(invoice);
    const tax = invoiceTax(invoice);
    const total = invoiceTotal(invoice);
    const itemRows = invoice.items.map((item) => `
        <tr>
            <td>${escapeHtml(item.description)}</td>
            <td class="number-cell">${Number(item.quantity || 0).toLocaleString('en-AU')}</td>
            <td class="number-cell">${money(item.rate)}</td>
            <td class="number-cell">${money(Number(item.quantity || 0) * Number(item.rate || 0))}</td>
        </tr>
    `).join('');

    els.invoiceDetail.innerHTML = `
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
                ${state.mode === 'admin' ? '<button class="action-button" type="button" id="editInvoiceButton"><i class="bi bi-pencil-square"></i>Edit invoice</button>' : ''}
            </div>
        </div>
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
            <tr>
                <td>Subtotal</td>
                <td class="number-cell">${money(subtotal)}</td>
            </tr>
            <tr>
                <td>GST ${Math.round(Number(invoice.taxRate || 0) * 100)}%</td>
                <td class="number-cell">${money(tax)}</td>
            </tr>
            <tr>
                <td>Total</td>
                <td class="number-cell">${money(total)}</td>
            </tr>
        </table>
        <div class="invoice-notes">
            <strong>Notes</strong>
            <p>${escapeHtml(invoice.notes || 'No notes added.')}</p>
        </div>
    `;
}

function printInvoiceDetail() {
    if (!selectedInvoice()) {
        return;
    }

    const cleanup = () => {
        window.removeEventListener('afterprint', cleanup);
        document.body.classList.remove('invoice-printing');
    };

    document.body.classList.add('invoice-printing');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 5000);
}

function render() {
    ensureSelection();
    els.body.classList.toggle('admin-mode', state.mode === 'admin');
    renderSummary();
    renderClients();
    renderInvoices();
    renderInvoiceDetail();
}

function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        return;
    }

    dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
    if (typeof dialog.close === 'function') {
        dialog.close();
        return;
    }

    dialog.removeAttribute('open');
}

function openClientEditor(client = null) {
    els.clientDialogTitle.textContent = client ? 'Edit client' : 'Add client';
    els.clientId.value = client?.id || '';
    els.clientBusiness.value = client?.business || '';
    els.clientContact.value = client?.contact || '';
    els.clientEmail.value = client?.email || '';
    els.clientNotes.value = client?.notes || '';
    els.deleteClientButton.style.visibility = client ? 'visible' : 'hidden';
    openDialog(els.clientDialog);
}

function addLineEditorRow(item = { description: '', quantity: 1, rate: 0 }) {
    const row = els.lineItemTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-line-field="description"]').value = item.description || '';
    row.querySelector('[data-line-field="quantity"]').value = item.quantity ?? 1;
    row.querySelector('[data-line-field="rate"]').value = item.rate ?? 0;
    els.lineItemsEditor.appendChild(row);
}

function openInvoiceEditor(invoice = null) {
    const today = new Date().toISOString().slice(0, 10);
    els.invoiceDialogTitle.textContent = invoice ? 'Edit invoice' : 'Add invoice';
    els.invoiceId.value = invoice?.id || '';
    els.invoiceNumber.value = invoice?.number || `NI-${Math.floor(1000 + Math.random() * 9000)}`;
    els.invoiceStatus.value = invoice?.status || 'draft';
    els.invoiceIssued.value = invoice?.issued || today;
    els.invoiceDue.value = invoice?.due || today;
    els.invoiceNotes.value = invoice?.notes || '';
    els.deleteInvoiceButton.style.visibility = invoice ? 'visible' : 'hidden';
    els.lineItemsEditor.textContent = '';

    const items = invoice?.items?.length ? invoice.items : [{ description: '', quantity: 1, rate: 0 }];
    items.forEach(addLineEditorRow);
    openDialog(els.invoiceDialog);
}

document.querySelectorAll('.mode-button').forEach((button) => {
    button.addEventListener('click', () => {
        state.mode = button.dataset.mode;
        document.querySelectorAll('.mode-button').forEach((modeButton) => {
            const active = modeButton === button;
            modeButton.classList.toggle('active', active);
            modeButton.setAttribute('aria-selected', String(active));
        });
        render();
    });
});

els.clientSearch.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderClients();
});

els.clientList.addEventListener('click', (event) => {
    const card = event.target.closest('.client-card');
    if (!card) {
        return;
    }

    const client = state.clients.find((item) => item.id === card.dataset.clientId);
    if (!client) {
        return;
    }

    if (event.target.closest('[data-edit-client]')) {
        openClientEditor(client);
        return;
    }

    state.selectedClientId = client.id;
    state.selectedInvoiceId = client.invoices[0]?.id || null;
    render();
});

els.invoiceList.addEventListener('click', (event) => {
    const card = event.target.closest('.invoice-card');
    if (!card) {
        return;
    }

    state.selectedInvoiceId = card.dataset.invoiceId;
    render();
});

els.invoiceDetail.addEventListener('click', (event) => {
    if (event.target.closest('#editInvoiceButton')) {
        openInvoiceEditor(selectedInvoice());
    }
});

els.addClientButton.addEventListener('click', () => openClientEditor());

els.addInvoiceButton.addEventListener('click', () => {
    if (!selectedClient()) {
        return;
    }

    openInvoiceEditor();
});

els.printInvoiceButton.addEventListener('click', () => {
    printInvoiceDetail();
});

document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
        closeDialog(document.getElementById(button.dataset.closeDialog));
    });
});

els.clientForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = els.clientId.value || makeId('client');
    const existing = state.clients.find((client) => client.id === id);
    const payload = {
        id,
        business: els.clientBusiness.value.trim(),
        contact: els.clientContact.value.trim(),
        email: els.clientEmail.value.trim(),
        notes: els.clientNotes.value.trim(),
        invoices: existing?.invoices || []
    };

    if (existing) {
        Object.assign(existing, payload);
    } else {
        state.clients.push(payload);
        state.selectedClientId = id;
        state.selectedInvoiceId = null;
    }

    saveClients();
    closeDialog(els.clientDialog);
    render();
});

els.deleteClientButton.addEventListener('click', () => {
    const client = selectedClient();
    if (!client || els.clientId.value !== client.id) {
        return;
    }

    const confirmed = window.confirm(`Delete ${client.business} and all of their invoices?`);
    if (!confirmed) {
        return;
    }

    state.clients = state.clients.filter((item) => item.id !== client.id);
    state.selectedClientId = state.clients[0]?.id || null;
    state.selectedInvoiceId = state.clients[0]?.invoices[0]?.id || null;
    saveClients();
    closeDialog(els.clientDialog);
    render();
});

els.addLineButton.addEventListener('click', () => addLineEditorRow());

els.lineItemsEditor.addEventListener('click', (event) => {
    if (!event.target.closest('[data-remove-line]')) {
        return;
    }

    const rows = els.lineItemsEditor.querySelectorAll('.line-item-row');
    if (rows.length === 1) {
        rows[0].querySelectorAll('input').forEach((input) => {
            input.value = input.dataset.lineField === 'description' ? '' : 0;
        });
        return;
    }

    event.target.closest('.line-item-row').remove();
});

els.invoiceForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const client = selectedClient();
    if (!client) {
        return;
    }

    const id = els.invoiceId.value || makeId('invoice');
    const existing = client.invoices.find((invoice) => invoice.id === id);
    const items = [...els.lineItemsEditor.querySelectorAll('.line-item-row')]
        .map((row) => ({
            description: row.querySelector('[data-line-field="description"]').value.trim(),
            quantity: Number(row.querySelector('[data-line-field="quantity"]').value || 0),
            rate: Number(row.querySelector('[data-line-field="rate"]').value || 0)
        }))
        .filter((item) => item.description || item.quantity || item.rate);

    const payload = {
        id,
        number: els.invoiceNumber.value.trim(),
        status: els.invoiceStatus.value,
        issued: els.invoiceIssued.value,
        due: els.invoiceDue.value,
        taxRate: existing?.taxRate ?? 0.1,
        notes: els.invoiceNotes.value.trim(),
        items
    };

    if (existing) {
        Object.assign(existing, payload);
    } else {
        client.invoices.push(payload);
        state.selectedInvoiceId = id;
    }

    saveClients();
    closeDialog(els.invoiceDialog);
    render();
});

els.deleteInvoiceButton.addEventListener('click', () => {
    const client = selectedClient();
    const invoice = selectedInvoice();
    if (!client || !invoice || els.invoiceId.value !== invoice.id) {
        return;
    }

    const confirmed = window.confirm(`Delete invoice ${invoice.number}?`);
    if (!confirmed) {
        return;
    }

    client.invoices = client.invoices.filter((item) => item.id !== invoice.id);
    state.selectedInvoiceId = client.invoices[0]?.id || null;
    saveClients();
    closeDialog(els.invoiceDialog);
    render();
});

render();
