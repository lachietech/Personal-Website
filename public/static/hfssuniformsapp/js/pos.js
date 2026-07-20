import { PosProductAdminController } from './pos/product-admin.js';

const posApp = window.UniformShopApp;
const productAdmin = new PosProductAdminController({
    app: posApp,
    refreshCatalog: () => loadPOSProducts()
});

function setupPOS() {
    const refreshBtn = document.getElementById('posRefreshBtn');
    const groupButtons = document.querySelectorAll('[data-pos-group]');
    const searchInput = document.getElementById('posSearchInput');
    const clearBtn = document.getElementById('posClearCartBtn');
    const payCashBtn = document.getElementById('posPayCashBtn');
    const payCardBtn = document.getElementById('posPayCardBtn');
    const payCenterPayBtn = document.getElementById('posPayCenterPayBtn');
    const addProductBtn = document.getElementById('posAddProductBtn');
    const saveProductBtn = document.getElementById('posSaveProductBtn');
    const closeProductBtn = document.getElementById('posProductClose');
    const cancelProductBtn = document.getElementById('posCancelProductBtn');
    const filterOrdersBtn = document.getElementById('posFilterOrdersBtn');
    const clearOrdersBtn = document.getElementById('posClearOrdersBtn');
    const keypadButtons = document.querySelectorAll('[data-key]');
    const keypadBackBtn = document.getElementById('posKeyBackBtn');
    const keypadClearBtn = document.getElementById('posKeyClearBtn');
    const setQtyBtn = document.getElementById('posSetQtyBtn');
    const addQtyBtn = document.getElementById('posAddQtyBtn');
    const productsEl = document.getElementById('posProducts');
    const cartBody = document.getElementById('posCartBody');

    posApp.state.posSearchQuery = '';
    posApp.state.posSelectedGroup = 'Shirts';
    posApp.state.posSelectedCartIndex = null;
    posApp.state.posKeypadValue = '';
    renderPOSKeypadDisplay();

    refreshBtn?.addEventListener('click', loadPOSProducts);
    groupButtons.forEach((button) => {
        button.addEventListener('click', () => {
            posApp.state.posSelectedGroup = button.getAttribute('data-pos-group') || 'Shirts';
            renderPOSGroupKeys();
            renderPOSProducts();
        });
    });
    searchInput?.addEventListener('input', (event) => {
        posApp.state.posSearchQuery = String(event.target.value || '').trim().toLowerCase();
        renderPOSProducts();
    });
    productsEl?.addEventListener('click', handlePOSProductClick);
    cartBody?.addEventListener('click', handlePOSCartClick);

    keypadButtons.forEach((button) => {
        button.addEventListener('click', () => appendKeypadValue(button.getAttribute('data-key') || ''));
    });
    keypadBackBtn?.addEventListener('click', backspaceKeypadValue);
    keypadClearBtn?.addEventListener('click', clearKeypadValue);
    setQtyBtn?.addEventListener('click', () => applyKeypadQuantity(false));
    addQtyBtn?.addEventListener('click', () => applyKeypadQuantity(true));

    clearBtn?.addEventListener('click', () => {
        posApp.state.posCart = [];
        posApp.state.posSelectedCartIndex = null;
        clearKeypadValue();
        renderPOSCart();
    });

    payCashBtn?.addEventListener('click', async () => {
        if (!posApp.state.posCart.length) return;
        const total = getPOSCartTotal();
        const entered = Number.parseFloat(posApp.state.posKeypadValue || '');
        const tendered = Number.isFinite(entered) && entered > 0 ? entered : total;
        if (Number.isNaN(tendered) || tendered < total) {
            alert(`Cash received must be at least ${posApp.formatCurrency(total)}. Enter amount on keypad.`);
            return;
        }
        await submitPOSOrder('cash', tendered);
        alert(`Order complete. Change due: ${posApp.formatCurrency(tendered - total)}`);
    });

    payCardBtn?.addEventListener('click', async () => {
        if (!posApp.state.posCart.length) return;
        await submitPOSOrder('card', 0);
        alert('Card payment complete.');
    });

    payCenterPayBtn?.addEventListener('click', async () => {
        if (!posApp.state.posCart.length) return;
        await submitPOSOrder('center-pay', 0);
        alert('Center Pay transaction recorded.');
    });

    addProductBtn?.addEventListener('click', () => productAdmin.open());
    saveProductBtn?.addEventListener('click', () => productAdmin.save());
    closeProductBtn?.addEventListener('click', () => productAdmin.close());
    cancelProductBtn?.addEventListener('click', () => productAdmin.close());

    const modal = document.getElementById('posProductModal');
    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target === modal) productAdmin.close();
        });
    }

    filterOrdersBtn?.addEventListener('click', () => {
        loadPOSOrders(document.getElementById('posOrderDate')?.value || '');
    });

    clearOrdersBtn?.addEventListener('click', () => {
        const dateEl = document.getElementById('posOrderDate');
        if (dateEl) dateEl.value = '';
        loadPOSOrders('');
    });
}

function loadPOSSection() {
    loadPOSProducts();
}

async function loadPOSProducts() {
    const productsEl = document.getElementById('posProducts');
    if (productsEl) productsEl.innerHTML = '<p class="loading">Loading POS products...</p>';
    try {
        const response = await fetch('/api/pos/products');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load POS products');
        posApp.state.posProducts = Array.isArray(data) ? data : [];
        renderPOSGroupKeys();
        renderPOSProducts();
    } catch (error) {
        if (productsEl) productsEl.innerHTML = `<p class="loading" style="color: #d9534f;">${error.message}</p>`;
    }
}

function normalizePOSGroup(category) {
    const value = String(category || '').trim().toLowerCase();
    if (value === 'shirt' || value === 'shirts') return 'Shirts';
    if (value === 'short' || value === 'shorts') return 'Shorts';
    if (value === 'skort' || value === 'skorts') return 'Skorts';
    if (value === 'hat' || value === 'hats') return 'Hat';
    return '';
}

function renderPOSGroupKeys() {
    document.querySelectorAll('[data-pos-group]').forEach((button) => {
        const group = button.getAttribute('data-pos-group') || '';
        button.classList.toggle('active', group === posApp.state.posSelectedGroup);
        button.classList.toggle('btn-primary', group === posApp.state.posSelectedGroup);
        button.classList.toggle('btn-secondary', group !== posApp.state.posSelectedGroup);
    });
}

function renderPOSProducts() {
    const productsEl = document.getElementById('posProducts');
    const selectedGroup = posApp.state.posSelectedGroup || 'Shirts';
    if (!productsEl) return;

    const query = String(posApp.state.posSearchQuery || '').trim().toLowerCase();

    const filtered = posApp.state.posProducts.filter((product) => {
        const matchesCategory = normalizePOSGroup(product.category) === selectedGroup;
        if (!matchesCategory) {
            return false;
        }
        if (!query) {
            return true;
        }

        const searchHaystack = [
            product.name,
            product.category,
            product.size,
            product.sku
        ]
            .map((value) => String(value || '').toLowerCase())
            .join(' ');

        return searchHaystack.includes(query);
    });

    if (!filtered.length) {
        productsEl.innerHTML = '<p class="loading">No POS products found.</p>';
        return;
    }

    posApp.replaceChildren(productsEl, filtered.map((product) => {
        return posApp.el('button', {
            className: 'pos-product-btn',
            type: 'button',
            dataset: { id: product._id }
        }, [
            posApp.el('span', { className: 'pos-product-name', text: product.name || '' }),
            posApp.el('span', {
                className: 'pos-product-meta',
                text: `${product.category || ''}${product.size ? ` | ${product.size}` : ''}`.trim()
            }),
            posApp.el('span', { className: 'pos-product-meta', text: `On Hand: ${Number(product.stockOnHand || 0)}` }),
            posApp.el('span', { className: 'pos-product-meta', text: posApp.formatCurrency(product.price) })
        ]);
    }));
}

function createPOSCartRow(item, index) {
    const row = posApp.el('tr', {
        className: index === posApp.state.posSelectedCartIndex ? 'pos-cart-row-selected' : '',
        attrs: { 'data-pos-select': index }
    });

    const subtotal = item.qty * item.price;
    row.appendChild(posApp.el('td', { text: item.name || '' }));

    const quantityCell = posApp.el('td');
    const decButton = posApp.el('button', {
        className: 'btn btn-secondary btn-small',
        type: 'button',
        attrs: { 'data-pos-dec': index },
        text: '-'
    });
    const incButton = posApp.el('button', {
        className: 'btn btn-secondary btn-small',
        type: 'button',
        attrs: { 'data-pos-inc': index },
        text: '+'
    });
    quantityCell.append(decButton, document.createTextNode(` ${item.qty} `), incButton);
    row.appendChild(quantityCell);

    row.appendChild(posApp.el('td', { text: posApp.formatCurrency(item.price) }));
    row.appendChild(posApp.el('td', { text: posApp.formatCurrency(subtotal) }));

    const actionsCell = posApp.el('td');
    const removeButton = posApp.el('button', {
        className: 'btn btn-danger btn-small',
        type: 'button',
        attrs: { 'data-pos-del': index },
        text: 'Remove'
    });
    actionsCell.appendChild(removeButton);
    row.appendChild(actionsCell);
    return row;
}

function handlePOSProductClick(event) {
    const button = event.target.closest('[data-id]');
    if (!button) {
        return;
    }
    addProductToPOSCart(button.dataset.id);
}

function handlePOSCartClick(event) {
    const incButton = event.target.closest('[data-pos-inc]');
    if (incButton) {
        const index = Number(incButton.getAttribute('data-pos-inc'));
        if (!Number.isNaN(index) && posApp.state.posCart[index]) {
            const targetItem = posApp.state.posCart[index];
            const stockOnHand = getProductStockOnHand(targetItem.productId);
            if (targetItem.qty + 1 > stockOnHand) {
                alert(`Not enough stock on hand for ${targetItem.name}.`);
                return;
            }
            targetItem.qty += 1;
            posApp.state.posSelectedCartIndex = index;
            renderPOSCart();
        }
        return;
    }

    const decButton = event.target.closest('[data-pos-dec]');
    if (decButton) {
        const index = Number(decButton.getAttribute('data-pos-dec'));
        if (!Number.isNaN(index) && posApp.state.posCart[index]) {
            posApp.state.posCart[index].qty -= 1;
            if (posApp.state.posCart[index].qty <= 0) {
                posApp.state.posCart.splice(index, 1);
            }
            posApp.state.posSelectedCartIndex = posApp.state.posCart.length ? Math.max(0, index - 1) : null;
            renderPOSCart();
        }
        return;
    }

    const removeButton = event.target.closest('[data-pos-del]');
    if (removeButton) {
        const index = Number(removeButton.getAttribute('data-pos-del'));
        if (!Number.isNaN(index)) {
            posApp.state.posCart.splice(index, 1);
            posApp.state.posSelectedCartIndex = posApp.state.posCart.length ? Math.max(0, index - 1) : null;
            renderPOSCart();
        }
        return;
    }

    const row = event.target.closest('[data-pos-select]');
    if (!row) {
        return;
    }

    const index = Number(row.getAttribute('data-pos-select'));
    if (!Number.isNaN(index)) {
        posApp.state.posSelectedCartIndex = index;
        renderPOSCart();
    }
}

function addProductToPOSCart(productId) {
    const product = posApp.state.posProducts.find((item) => item._id === productId);
    if (!product) return;

    const availableOnHand = Number(product.stockOnHand || 0);

    const existing = posApp.state.posCart.find((item) => item.productId === productId);
    if (existing) {
        if (existing.qty + 1 > availableOnHand) {
            alert(`Not enough stock on hand for ${product.name}.`);
            return;
        }
        existing.qty += 1;
        posApp.state.posSelectedCartIndex = posApp.state.posCart.findIndex((item) => item.productId === productId);
    } else {
        if (availableOnHand < 1) {
            alert(`No stock on hand available for ${product.name}.`);
            return;
        }
        posApp.state.posCart.push({
            productId,
            name: product.name,
            price: Number(product.price || 0),
            qty: 1,
            salesRecordId: product.salesRecordId || null,
            category: product.category || '',
            size: product.size || ''
        });
        posApp.state.posSelectedCartIndex = posApp.state.posCart.length - 1;
    }
    renderPOSCart();
}

function getPOSCartTotal() {
    return posApp.state.posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function renderPOSCart() {
    const body = document.getElementById('posCartBody');
    const totalEl = document.getElementById('posCartTotal');
    const selectedLabel = document.getElementById('posSelectedItemLabel');
    if (!body || !totalEl) return;

    if (!posApp.state.posCart.length) {
        body.innerHTML = '<tr><td colspan="5" class="loading">Cart is empty.</td></tr>';
        totalEl.textContent = posApp.formatCurrency(0);
        if (selectedLabel) {
            selectedLabel.textContent = 'No item selected';
        }
        return;
    }

    if (posApp.state.posSelectedCartIndex === null || posApp.state.posSelectedCartIndex >= posApp.state.posCart.length) {
        posApp.state.posSelectedCartIndex = 0;
    }

    if (selectedLabel) {
        const selectedItem = posApp.state.posCart[posApp.state.posSelectedCartIndex];
        selectedLabel.textContent = selectedItem
            ? `Selected: ${selectedItem.name} (${selectedItem.qty})`
            : 'No item selected';
    }

    posApp.replaceChildren(body, posApp.state.posCart.map((item, index) => createPOSCartRow(item, index)));

    totalEl.textContent = posApp.formatCurrency(getPOSCartTotal());
}

function renderPOSKeypadDisplay() {
    const display = document.getElementById('posKeypadDisplay');
    if (display) {
        display.textContent = posApp.state.posKeypadValue || '0';
    }
}

function appendKeypadValue(key) {
    if (!key) {
        return;
    }

    let nextValue = String(posApp.state.posKeypadValue || '');

    if (key === '.') {
        if (nextValue.includes('.')) {
            return;
        }
        nextValue = nextValue ? `${nextValue}.` : '0.';
    } else {
        nextValue += key;
    }

    if (nextValue.length > 10) {
        return;
    }

    posApp.state.posKeypadValue = nextValue;
    renderPOSKeypadDisplay();
}

function backspaceKeypadValue() {
    const current = String(posApp.state.posKeypadValue || '');
    posApp.state.posKeypadValue = current.slice(0, -1);
    renderPOSKeypadDisplay();
}

function clearKeypadValue() {
    posApp.state.posKeypadValue = '';
    renderPOSKeypadDisplay();
}

function getProductStockOnHand(productId) {
    const product = posApp.state.posProducts.find((item) => item._id === productId);
    return Number(product?.stockOnHand || 0);
}

function applyKeypadQuantity(isIncrementMode) {
    const selectedIndex = Number(posApp.state.posSelectedCartIndex);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= posApp.state.posCart.length) {
        alert('Select a cart item first.');
        return;
    }

    const entered = Number.parseFloat(String(posApp.state.posKeypadValue || ''));
    if (!Number.isFinite(entered) || entered <= 0) {
        alert('Enter a quantity on the keypad first.');
        return;
    }

    const quantity = Math.floor(entered);
    if (quantity < 1) {
        alert('Quantity must be at least 1.');
        return;
    }

    const item = posApp.state.posCart[selectedIndex];
    const stockOnHand = getProductStockOnHand(item.productId);
    const nextQty = isIncrementMode ? item.qty + quantity : quantity;

    if (nextQty > stockOnHand) {
        alert(`Not enough stock on hand for ${item.name}.`);
        return;
    }

    item.qty = nextQty;
    clearKeypadValue();
    renderPOSCart();
}

async function submitPOSOrder(paymentMethod, amountTendered) {
    const items = posApp.state.posCart.map((item) => ({
        productId: item.productId,
        salesRecordId: item.salesRecordId || null,
        category: item.category || '',
        size: item.size || '',
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: Number((item.price * item.qty).toFixed(2))
    }));

    const response = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, paymentMethod, amountTendered })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
    }

    posApp.state.posCart = [];
    posApp.state.posSelectedCartIndex = null;
    clearKeypadValue();
    renderPOSCart();
    loadPOSOrders(document.getElementById('posOrderDate')?.value || '');
    loadPOSProducts();
}

async function loadPOSOrders(date) {
    const body = document.getElementById('posOrdersBody');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="6" class="loading">Loading POS orders...</td></tr>';

    try {
        const query = new URLSearchParams({ limit: '200' });
        if (date) query.set('date', date);
        const response = await fetch(`/api/pos/orders?${query.toString()}`);
        const orders = await response.json();
        if (!response.ok) throw new Error(orders.error || 'Failed to load orders');

        if (!orders.length) {
            body.innerHTML = '<tr><td colspan="6" class="loading">No POS orders found.</td></tr>';
            return;
        }

        body.innerHTML = '';
        orders.forEach((order) => {
            const row = document.createElement('tr');

            const orderNumberCell = document.createElement('td');
            orderNumberCell.textContent = order.orderNumber || '';
            row.appendChild(orderNumberCell);

            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(order.createdAt).toLocaleString();
            row.appendChild(dateCell);

            const itemsCell = document.createElement('td');
            itemsCell.textContent = String(order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0));
            row.appendChild(itemsCell);

            const totalCell = document.createElement('td');
            totalCell.textContent = posApp.formatCurrency(order.total);
            row.appendChild(totalCell);

            const paymentCell = document.createElement('td');
            paymentCell.textContent = String(order.paymentMethod || '').toUpperCase();
            row.appendChild(paymentCell);

            const statusCell = document.createElement('td');
            statusCell.textContent = order.receiptStatus || '-';
            row.appendChild(statusCell);

            body.appendChild(row);
        });
    } catch (error) {
        body.innerHTML = `<tr><td colspan="6" style="color: #d9534f;">${posApp.escapeHtml(error.message)}</td></tr>`;
    }
}

posApp.setupPOS = setupPOS;
posApp.renderPOSCart = renderPOSCart;
posApp.loadPOSSection = loadPOSSection;
posApp.loadPOSOrders = loadPOSOrders;
posApp.loadPOSProductsAdmin = () => productAdmin.load();
posApp.openPOSProductModal = (product) => productAdmin.open(product);
