const state = {
    clients: [],
    billing: null,
    user: null,
    selectedClientId: null,
    selectedInvoiceId: null,
    search: ''
};

const els = {
    tabButtons: document.querySelectorAll('.tab-button'),
    tabPanels: document.querySelectorAll('[data-tab-panel]'),
    logoutButton: document.getElementById('logoutButton'),
    printInvoiceButton: document.getElementById('printInvoiceButton'),
    passwordNotice: document.getElementById('passwordNotice'),
    clientSearch: document.getElementById('clientSearch'),
    clientList: document.getElementById('clientList'),
    newClientButton: document.getElementById('newClientButton'),
    deleteClientButton: document.getElementById('deleteClientButton'),
    clientForm: document.getElementById('clientForm'),
    clientFormTitle: document.getElementById('clientFormTitle'),
    clientBusiness: document.getElementById('clientBusiness'),
    clientContact: document.getElementById('clientContact'),
    clientEmail: document.getElementById('clientEmail'),
    clientUsername: document.getElementById('clientUsername'),
    clientPassword: document.getElementById('clientPassword'),
    clientNotes: document.getElementById('clientNotes'),
    clientActive: document.getElementById('clientActive'),
    clientMessage: document.getElementById('clientMessage'),
    invoiceList: document.getElementById('invoiceList'),
    invoiceForm: document.getElementById('invoiceForm'),
    invoiceFormTitle: document.getElementById('invoiceFormTitle'),
    deleteInvoiceButton: document.getElementById('deleteInvoiceButton'),
    invoiceNumber: document.getElementById('invoiceNumber'),
    invoiceStatus: document.getElementById('invoiceStatus'),
    invoiceIssued: document.getElementById('invoiceIssued'),
    invoiceDue: document.getElementById('invoiceDue'),
    invoiceTaxRate: document.getElementById('invoiceTaxRate'),
    invoiceNotes: document.getElementById('invoiceNotes'),
    addLineButton: document.getElementById('addLineButton'),
    lineItemsEditor: document.getElementById('lineItemsEditor'),
    lineItemTemplate: document.getElementById('lineItemTemplate'),
    addHourButton: document.getElementById('addHourButton'),
    hoursEditor: document.getElementById('hoursEditor'),
    hourEntryTemplate: document.getElementById('hourEntryTemplate'),
    hoursTotal: document.getElementById('hoursTotal'),
    invoiceMessage: document.getElementById('invoiceMessage'),
    invoiceDetail: document.getElementById('invoiceDetail'),
    sendAccountEmailButton: document.getElementById('sendAccountEmailButton'),
    sendInvoiceEmailButton: document.getElementById('sendInvoiceEmailButton'),
    sendReminderEmailButton: document.getElementById('sendReminderEmailButton'),
    emailMessage: document.getElementById('emailMessage'),
    billingForm: document.getElementById('billingForm'),
    billingBusinessName: document.getElementById('billingBusinessName'),
    billingAbn: document.getElementById('billingAbn'),
    billingBankName: document.getElementById('billingBankName'),
    billingAccountName: document.getElementById('billingAccountName'),
    billingBsb: document.getElementById('billingBsb'),
    billingAccountNumber: document.getElementById('billingAccountNumber'),
    billingPaymentReference: document.getElementById('billingPaymentReference'),
    billingPaymentTerms: document.getElementById('billingPaymentTerms'),
    billingMessage: document.getElementById('billingMessage'),
    accountForm: document.getElementById('accountForm'),
    accountUsername: document.getElementById('accountUsername'),
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    accountMessage: document.getElementById('accountMessage')
};

function today() {
    return new Date().toISOString().slice(0, 10);
}

function selectedClient() {
    return state.clients.find((client) => client.id === state.selectedClientId) || state.clients[0] || null;
}

function selectedInvoice() {
    const client = selectedClient();
    return client?.invoices.find((invoice) => invoice.id === state.selectedInvoiceId) || client?.invoices[0] || null;
}

function filteredClients() {
    const search = state.search.trim().toLowerCase();
    if (!search) {
        return state.clients;
    }

    return state.clients.filter((client) => {
        return [client.business, client.contact, client.email, client.username]
            .join(' ')
            .toLowerCase()
            .includes(search);
    });
}

function addLineRow(item = { description: '', quantity: 1, rate: 0 }) {
    const row = els.lineItemTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-line-field="description"]').value = item.description || '';
    row.querySelector('[data-line-field="quantity"]').value = item.quantity ?? 1;
    row.querySelector('[data-line-field="rate"]').value = item.rate ?? 0;
    els.lineItemsEditor.appendChild(row);
}

function addHourRow(entry = { date: today(), hours: 0, work: '' }) {
    const row = els.hourEntryTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-hour-field="date"]').value = entry.date || today();
    row.querySelector('[data-hour-field="hours"]').value = entry.hours ?? 0;
    row.querySelector('[data-hour-field="work"]').value = entry.work || '';
    els.hoursEditor.appendChild(row);
    syncHoursTotal();
}

function syncHoursTotal() {
    const total = [...els.hoursEditor.querySelectorAll('[data-hour-field="hours"]')]
        .reduce((sum, input) => sum + Number(input.value || 0), 0);
    els.hoursTotal.textContent = `${total.toFixed(2)} hours`;
}

function setActiveTab(tab) {
    els.tabButtons.forEach((button) => {
        const active = button.dataset.tab === tab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    });
    els.tabPanels.forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== tab;
    });
}

function resetClientForm() {
    state.selectedClientId = null;
    state.selectedInvoiceId = null;
    els.clientFormTitle.textContent = 'Create client';
    els.clientForm.reset();
    els.clientActive.checked = true;
    els.clientPassword.required = true;
    els.deleteClientButton.hidden = true;
    resetInvoiceForm();
    Portal.setMessage(els.clientMessage, '');
    render();
}

function fillClientForm(client) {
    els.clientFormTitle.textContent = `Edit ${client.business}`;
    els.clientBusiness.value = client.business;
    els.clientContact.value = client.contact;
    els.clientEmail.value = client.email;
    els.clientUsername.value = client.username;
    els.clientPassword.value = '';
    els.clientPassword.required = false;
    els.clientNotes.value = client.notes || '';
    els.clientActive.checked = client.userActive !== false;
    els.deleteClientButton.hidden = false;
}

function resetInvoiceForm() {
    els.invoiceFormTitle.textContent = 'Create invoice';
    els.invoiceForm.reset();
    els.invoiceNumber.value = `NI-${Math.floor(1000 + Math.random() * 9000)}`;
    els.invoiceIssued.value = today();
    els.invoiceDue.value = today();
    els.invoiceTaxRate.value = '0.1';
    els.deleteInvoiceButton.hidden = true;
    els.lineItemsEditor.textContent = '';
    addLineRow();
    els.hoursEditor.textContent = '';
    addHourRow();
    Portal.setMessage(els.invoiceMessage, '');
}

function fillInvoiceForm(invoice) {
    els.invoiceFormTitle.textContent = `Edit ${invoice.number}`;
    els.invoiceNumber.value = invoice.number;
    els.invoiceStatus.value = invoice.status;
    els.invoiceIssued.value = invoice.issued;
    els.invoiceDue.value = invoice.due;
    els.invoiceTaxRate.value = invoice.taxRate ?? 0.1;
    els.invoiceNotes.value = invoice.notes || '';
    els.deleteInvoiceButton.hidden = false;
    els.lineItemsEditor.textContent = '';
    const items = invoice.items.length ? invoice.items : [{ description: '', quantity: 1, rate: 0 }];
    items.forEach(addLineRow);
    els.hoursEditor.textContent = '';
    const hours = invoice.hours?.length ? invoice.hours : [{ date: today(), hours: 0, work: '' }];
    hours.forEach(addHourRow);
    syncHoursTotal();
}

function fillBillingForm() {
    const billing = state.billing || {};
    els.billingBusinessName.value = billing.businessName || '';
    els.billingAbn.value = billing.abn || '';
    els.billingBankName.value = billing.bankName || '';
    els.billingAccountName.value = billing.accountName || '';
    els.billingBsb.value = billing.bsb || '';
    els.billingAccountNumber.value = billing.accountNumber || '';
    els.billingPaymentReference.value = billing.paymentReference || '';
    els.billingPaymentTerms.value = billing.paymentTerms || '';
}

function renderClients() {
    const clients = filteredClients();
    els.clientList.textContent = '';

    if (!clients.length) {
        els.clientList.innerHTML = '<div class="empty-state"><h3>No clients found</h3><p>Create a client account to get started.</p></div>';
        return;
    }

    clients.forEach((client) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `client-card${client.id === state.selectedClientId ? ' active' : ''}`;
        button.dataset.clientId = client.id;
        button.innerHTML = `
            <strong>${Portal.escapeHtml(client.business)}</strong>
            <span>${Portal.escapeHtml(client.contact)} - ${Portal.escapeHtml(client.username)}</span>
            <div class="client-card-footer">
                <span>${Portal.money(Portal.amountOwing(client))} owing</span>
                <span>${client.userActive ? 'Active' : 'Inactive'}</span>
            </div>
        `;
        els.clientList.appendChild(button);
    });
}

function renderInvoices() {
    const client = selectedClient();
    els.invoiceList.textContent = '';

    if (!client) {
        els.invoiceList.innerHTML = '<div class="empty-state"><h3>No client selected</h3><p>Select or create a client first.</p></div>';
        return;
    }

    if (!client.invoices.length) {
        els.invoiceList.innerHTML = '<div class="empty-state"><h3>No invoices yet</h3><p>Save an invoice to build their itemised history.</p></div>';
        return;
    }

    client.invoices.forEach((invoice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `invoice-card${invoice.id === state.selectedInvoiceId ? ' active' : ''}`;
        button.dataset.invoiceId = invoice.id;
        button.innerHTML = `
            <strong>${Portal.escapeHtml(invoice.number)}</strong>
            <span>Due ${Portal.formatDate(invoice.due)}</span>
            <div class="invoice-card-footer">
                <span>${Portal.money(Portal.invoiceTotal(invoice))}</span>
                <span>${Portal.invoiceHours(invoice).toFixed(2)} hrs</span>
                <span class="status-pill status-${Portal.escapeHtml(invoice.status)}">${Portal.escapeHtml(invoice.status)}</span>
            </div>
        `;
        els.invoiceList.appendChild(button);
    });
}

function render() {
    const client = selectedClient();
    const invoice = selectedInvoice();
    state.selectedClientId = client?.id || state.selectedClientId;
    state.selectedInvoiceId = invoice?.id || null;

    els.passwordNotice.hidden = !state.user?.mustChangePassword;
    els.accountUsername.value = state.user?.username || '';
    renderClients();
    renderInvoices();
    Portal.renderInvoiceDetail(els.invoiceDetail, client, invoice, true, state.billing);
}

async function loadAdmin() {
    const [me, data] = await Promise.all([
        Portal.request('/clientportal/api/auth/me'),
        Portal.request('/clientportal/api/admin/clients')
    ]);
    state.user = me.user;
    state.clients = data.clients;
    state.billing = data.billing;
    state.selectedClientId = state.clients[0]?.id || null;
    state.selectedInvoiceId = selectedClient()?.invoices[0]?.id || null;
    if (selectedClient()) {
        fillClientForm(selectedClient());
    }
    resetInvoiceForm();
    fillBillingForm();
    render();
}

function clientPayload() {
    return {
        business: els.clientBusiness.value,
        contact: els.clientContact.value,
        email: els.clientEmail.value,
        username: els.clientUsername.value,
        password: els.clientPassword.value,
        notes: els.clientNotes.value,
        active: els.clientActive.checked
    };
}

function invoicePayload() {
    const items = [...els.lineItemsEditor.querySelectorAll('.line-item-row')].map((row) => ({
        description: row.querySelector('[data-line-field="description"]').value,
        quantity: Number(row.querySelector('[data-line-field="quantity"]').value || 0),
        rate: Number(row.querySelector('[data-line-field="rate"]').value || 0)
    }));
    const hours = [...els.hoursEditor.querySelectorAll('.hour-entry-row')].map((row) => ({
        date: row.querySelector('[data-hour-field="date"]').value,
        hours: Number(row.querySelector('[data-hour-field="hours"]').value || 0),
        work: row.querySelector('[data-hour-field="work"]').value
    }));

    return {
        number: els.invoiceNumber.value,
        status: els.invoiceStatus.value,
        issued: els.invoiceIssued.value,
        due: els.invoiceDue.value,
        taxRate: Number(els.invoiceTaxRate.value || 0),
        notes: els.invoiceNotes.value,
        items,
        hours
    };
}

function replaceClient(updatedClient) {
    const index = state.clients.findIndex((client) => client.id === updatedClient.id);
    if (index >= 0) {
        state.clients[index] = updatedClient;
    } else {
        state.clients.push(updatedClient);
    }
    state.selectedClientId = updatedClient.id;
}

function billingPayload() {
    return {
        businessName: els.billingBusinessName.value,
        abn: els.billingAbn.value,
        bankName: els.billingBankName.value,
        accountName: els.billingAccountName.value,
        bsb: els.billingBsb.value,
        accountNumber: els.billingAccountNumber.value,
        paymentReference: els.billingPaymentReference.value,
        paymentTerms: els.billingPaymentTerms.value
    };
}

els.newClientButton.addEventListener('click', resetClientForm);

els.tabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab));
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

    state.selectedClientId = card.dataset.clientId;
    const client = selectedClient();
    state.selectedInvoiceId = client.invoices[0]?.id || null;
    fillClientForm(client);
    resetInvoiceForm();
    render();
});

els.clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const client = selectedClient();
    const editing = Boolean(client && client.id === state.selectedClientId);
    Portal.setMessage(els.clientMessage, 'Saving client...');

    try {
        const data = await Portal.request(editing ? `/clientportal/api/admin/clients/${client.id}` : '/clientportal/api/admin/clients', {
            method: editing ? 'PUT' : 'POST',
            body: clientPayload()
        });
        replaceClient(data.client);
        fillClientForm(data.client);
        Portal.setMessage(els.clientMessage, 'Client saved.', 'success');
        render();
    } catch (error) {
        Portal.setMessage(els.clientMessage, error.message, 'error');
    }
});

els.deleteClientButton.addEventListener('click', async () => {
    const client = selectedClient();
    if (!client || !window.confirm(`Delete ${client.business} and their login?`)) {
        return;
    }

    await Portal.request(`/clientportal/api/admin/clients/${client.id}`, { method: 'DELETE', body: {} });
    state.clients = state.clients.filter((item) => item.id !== client.id);
    state.selectedClientId = state.clients[0]?.id || null;
    state.selectedInvoiceId = selectedClient()?.invoices[0]?.id || null;
    if (selectedClient()) {
        fillClientForm(selectedClient());
    } else {
        resetClientForm();
    }
    render();
});

els.invoiceList.addEventListener('click', (event) => {
    const card = event.target.closest('.invoice-card');
    if (!card) {
        return;
    }

    state.selectedInvoiceId = card.dataset.invoiceId;
    fillInvoiceForm(selectedInvoice());
    render();
});

els.invoiceDetail.addEventListener('click', (event) => {
    if (event.target.closest('#loadInvoiceButton') && selectedInvoice()) {
        fillInvoiceForm(selectedInvoice());
    }
});

els.addLineButton.addEventListener('click', () => addLineRow());

els.addHourButton.addEventListener('click', () => addHourRow());

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

els.hoursEditor.addEventListener('input', (event) => {
    if (event.target.matches('[data-hour-field="hours"]')) {
        syncHoursTotal();
    }
});

els.hoursEditor.addEventListener('click', (event) => {
    if (!event.target.closest('[data-remove-hour]')) {
        return;
    }

    const rows = els.hoursEditor.querySelectorAll('.hour-entry-row');
    if (rows.length === 1) {
        rows[0].querySelector('[data-hour-field="date"]').value = today();
        rows[0].querySelector('[data-hour-field="hours"]').value = 0;
        rows[0].querySelector('[data-hour-field="work"]').value = '';
        syncHoursTotal();
        return;
    }

    event.target.closest('.hour-entry-row').remove();
    syncHoursTotal();
});

els.invoiceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const client = selectedClient();
    if (!client) {
        Portal.setMessage(els.invoiceMessage, 'Select a client first.', 'error');
        return;
    }

    const invoice = selectedInvoice();
    const editing = Boolean(invoice && invoice.id === state.selectedInvoiceId && !els.deleteInvoiceButton.hidden);
    const url = editing
        ? `/clientportal/api/admin/clients/${client.id}/invoices/${invoice.id}`
        : `/clientportal/api/admin/clients/${client.id}/invoices`;

    Portal.setMessage(els.invoiceMessage, 'Saving invoice...');
    try {
        const data = await Portal.request(url, {
            method: editing ? 'PUT' : 'POST',
            body: invoicePayload()
        });
        replaceClient(data.client);
        const updatedClient = selectedClient();
        state.selectedInvoiceId = editing ? invoice.id : updatedClient.invoices[updatedClient.invoices.length - 1]?.id || null;
        fillInvoiceForm(selectedInvoice());
        Portal.setMessage(els.invoiceMessage, 'Invoice saved.', 'success');
        render();
    } catch (error) {
        Portal.setMessage(els.invoiceMessage, error.message, 'error');
    }
});

els.deleteInvoiceButton.addEventListener('click', async () => {
    const client = selectedClient();
    const invoice = selectedInvoice();
    if (!client || !invoice || !window.confirm(`Delete invoice ${invoice.number}?`)) {
        return;
    }

    const data = await Portal.request(`/clientportal/api/admin/clients/${client.id}/invoices/${invoice.id}`, {
        method: 'DELETE',
        body: {}
    });
    replaceClient(data.client);
    state.selectedInvoiceId = selectedClient().invoices[0]?.id || null;
    resetInvoiceForm();
    render();
});

async function sendEmailAction(endpoint, pendingMessage, successMessage) {
    const client = selectedClient();
    const invoice = selectedInvoice();
    if (!client) {
        Portal.setMessage(els.emailMessage, 'Select a client first.', 'error');
        return;
    }
    if (endpoint.includes(':invoiceId') && !invoice) {
        Portal.setMessage(els.emailMessage, 'Select an invoice first.', 'error');
        return;
    }

    const url = endpoint
        .replace(':clientId', client.id)
        .replace(':invoiceId', invoice?.id || '');

    Portal.setMessage(els.emailMessage, pendingMessage);
    try {
        const data = await Portal.request(url, { method: 'POST', body: {} });
        if (data.client) {
            replaceClient(data.client);
            render();
        }
        const skipped = data.email?.skipped ? ` (${data.email.reason})` : '';
        Portal.setMessage(els.emailMessage, `${successMessage}${skipped}`, data.email?.skipped ? '' : 'success');
    } catch (error) {
        Portal.setMessage(els.emailMessage, error.message, 'error');
    }
}

els.sendAccountEmailButton.addEventListener('click', () => {
    sendEmailAction('/clientportal/api/admin/clients/:clientId/emails/account', 'Sending account invite...', 'Account invite processed.');
});

els.sendInvoiceEmailButton.addEventListener('click', () => {
    sendEmailAction('/clientportal/api/admin/clients/:clientId/invoices/:invoiceId/email', 'Sending invoice...', 'Invoice email processed.');
});

els.sendReminderEmailButton.addEventListener('click', () => {
    sendEmailAction('/clientportal/api/admin/clients/:clientId/invoices/:invoiceId/reminder', 'Sending reminder...', 'Reminder email processed.');
});

els.billingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    Portal.setMessage(els.billingMessage, 'Saving billing details...');

    try {
        const data = await Portal.request('/clientportal/api/admin/settings/billing', {
            method: 'PUT',
            body: billingPayload()
        });
        state.billing = data.billing;
        fillBillingForm();
        render();
        Portal.setMessage(els.billingMessage, 'Billing details saved.', 'success');
    } catch (error) {
        Portal.setMessage(els.billingMessage, error.message, 'error');
    }
});

els.accountForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    Portal.setMessage(els.accountMessage, 'Updating account...');

    try {
        const data = await Portal.request('/clientportal/api/auth/account', {
            method: 'PUT',
            body: {
                username: els.accountUsername.value,
                currentPassword: els.currentPassword.value,
                newPassword: els.newPassword.value,
                confirmPassword: els.confirmPassword.value
            }
        });
        state.user = data.user;
        els.currentPassword.value = '';
        els.newPassword.value = '';
        els.confirmPassword.value = '';
        Portal.setMessage(els.accountMessage, 'Account updated.', 'success');
        render();
    } catch (error) {
        Portal.setMessage(els.accountMessage, error.message, 'error');
    }
});

els.logoutButton.addEventListener('click', async () => {
    await Portal.request('/clientportal/api/auth/logout', { method: 'POST', body: {} }).catch(() => {});
    window.location.assign('/clientportal/login');
});

els.printInvoiceButton.addEventListener('click', () => window.print());

resetInvoiceForm();
setActiveTab('clients');
loadAdmin().catch((error) => {
    els.invoiceDetail.innerHTML = `<div class="empty-state"><h3>Unable to load admin portal</h3><p>${Portal.escapeHtml(error.message)}</p></div>`;
});
