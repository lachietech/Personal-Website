const state = {
    client: null,
    billing: null,
    user: null,
    selectedInvoiceId: null
};

const els = {
    tabButtons: document.querySelectorAll('.tab-button'),
    tabPanels: document.querySelectorAll('[data-tab-panel]'),
    logoutButton: document.getElementById('logoutButton'),
    printInvoiceButton: document.getElementById('printInvoiceButton'),
    passwordNotice: document.getElementById('passwordNotice'),
    clientHeading: document.getElementById('clientHeading'),
    totalOwing: document.getElementById('totalOwing'),
    nextDue: document.getElementById('nextDue'),
    openInvoices: document.getElementById('openInvoices'),
    paidInvoices: document.getElementById('paidInvoices'),
    currentClientName: document.getElementById('currentClientName'),
    currentClientEmail: document.getElementById('currentClientEmail'),
    invoiceList: document.getElementById('invoiceList'),
    invoiceDetail: document.getElementById('invoiceDetail'),
    accountForm: document.getElementById('accountForm'),
    accountUsername: document.getElementById('accountUsername'),
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmPassword: document.getElementById('confirmPassword'),
    accountMessage: document.getElementById('accountMessage')
};

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

function selectedInvoice() {
    return state.client?.invoices.find((invoice) => invoice.id === state.selectedInvoiceId) || state.client?.invoices[0] || null;
}

function renderSummary() {
    const client = state.client;
    const open = client.invoices.filter((invoice) => invoice.status !== 'paid');
    const paid = client.invoices.filter((invoice) => invoice.status === 'paid');
    const nextDue = [...open].sort((a, b) => a.due.localeCompare(b.due))[0];

    els.clientHeading.textContent = `${client.business} invoices and balance.`;
    els.totalOwing.textContent = Portal.money(Portal.amountOwing(client));
    els.nextDue.textContent = nextDue ? `Next due ${Portal.formatDate(nextDue.due)}` : 'All invoices paid';
    els.openInvoices.textContent = String(open.length);
    els.paidInvoices.textContent = `${paid.length} paid invoice${paid.length === 1 ? '' : 's'}`;
    els.currentClientName.textContent = client.contact;
    els.currentClientEmail.textContent = client.email;
}

function renderInvoices() {
    els.invoiceList.textContent = '';
    if (!state.client.invoices.length) {
        els.invoiceList.innerHTML = '<div class="empty-state"><h3>No invoices yet</h3><p>Your invoices will appear here.</p></div>';
        return;
    }

    state.client.invoices.forEach((invoice) => {
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
    els.passwordNotice.hidden = !state.user.mustChangePassword;
    els.accountUsername.value = state.user.username;
    renderSummary();
    renderInvoices();
    Portal.renderInvoiceDetail(els.invoiceDetail, state.client, selectedInvoice(), false, state.billing);
}

async function loadDashboard() {
    const data = await Portal.request('/clientportal/api/client/dashboard');
    state.client = data.client;
    state.billing = data.billing;
    state.user = data.user;
    state.selectedInvoiceId = state.client.invoices[0]?.id || null;
    render();
}

els.invoiceList.addEventListener('click', (event) => {
    const card = event.target.closest('.invoice-card');
    if (!card) {
        return;
    }

    state.selectedInvoiceId = card.dataset.invoiceId;
    render();
});

els.tabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab));
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

setActiveTab('invoices');
loadDashboard().catch((error) => {
    els.invoiceDetail.innerHTML = `<div class="empty-state"><h3>Unable to load portal</h3><p>${Portal.escapeHtml(error.message)}</p></div>`;
});
