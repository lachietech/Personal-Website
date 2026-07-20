export class PosProductAdminController {
    constructor({ app, refreshCatalog }) {
        this.app = app;
        this.refreshCatalog = refreshCatalog;
    }

    async load() {
        const body = document.getElementById('posProductsAdminBody');
        if (!body) {
            return;
        }
        this.app.setTableMessage(body, 9, 'Loading POS products...');

        try {
            const response = await fetch('/api/pos/products/all');
            const products = await response.json();
            if (!response.ok) {
                throw new Error(products.error || 'Failed to load product admin');
            }
            if (!products.length) {
                this.app.setTableMessage(body, 9, 'No POS products found.');
                return;
            }
            body.replaceChildren(...products.map((product) => this.createRow(product)));
        } catch (error) {
            this.app.setTableMessage(body, 9, error.message, { color: '#d9534f' });
        }
    }

    createRow(product) {
        const row = document.createElement('tr');
        [
            product.name,
            product.category,
            product.size,
            product.sku,
            this.app.formatCurrency(product.price),
            Number(product.stockOnHand || 0),
            Number(product.stockInWarehouse || 0)
        ].forEach((value) => row.appendChild(this.app.createTableCell(value)));

        const statusPill = this.app.el('span', {
            className: `pos-status-pill ${product.active ? 'pos-status-active' : 'pos-status-inactive'}`,
            text: product.active ? 'Active' : 'Inactive'
        });
        row.appendChild(this.app.createTableCell(statusPill));

        const actions = document.createElement('td');
        actions.append(
            this.app.createButton({
                className: 'btn btn-secondary btn-small',
                text: 'Edit',
                onClick: () => this.open(product)
            }),
            this.app.createButton({
                className: 'btn btn-danger btn-small',
                text: product.active ? 'Deactivate' : 'Activate',
                onClick: () => this.toggleActive(product)
            })
        );
        row.appendChild(actions);
        return row;
    }

    async toggleActive(product) {
        const response = await fetch(`/api/pos/products/${product._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: product.name,
                category: product.category,
                size: product.size,
                sku: product.sku,
                price: product.price,
                stockOnHand: Number(product.stockOnHand || 0),
                stockInWarehouse: Number(product.stockInWarehouse || 0),
                active: !product.active
            })
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            alert(data.error || 'Failed to update product');
            return;
        }
        await Promise.all([this.load(), this.refreshCatalog()]);
    }

    open(product = null) {
        this.app.state.currentPosEditId = product?._id || null;
        const fields = this.fields();
        if (Object.values(fields).some((field) => !field)) {
            return;
        }

        fields.title.textContent = product ? 'Edit POS Product' : 'Add POS Product';
        fields.name.value = product?.name || '';
        fields.category.value = product?.category || '';
        fields.size.value = product?.size || '';
        fields.sku.value = product?.sku || '';
        fields.price.value = product?.price ?? '';
        fields.stockOnHand.value = product?.stockOnHand ?? 0;
        fields.stockInWarehouse.value = product?.stockInWarehouse ?? 0;
        fields.modal.classList.add('show');
    }

    close() {
        this.app.state.currentPosEditId = null;
        document.getElementById('posProductModal')?.classList.remove('show');
    }

    async save() {
        const fields = this.fields();
        const payload = {
            name: fields.name?.value.trim(),
            category: fields.category?.value.trim(),
            size: fields.size?.value.trim(),
            sku: fields.sku?.value.trim(),
            price: Number(fields.price?.value),
            stockOnHand: Number(fields.stockOnHand?.value || 0),
            stockInWarehouse: Number(fields.stockInWarehouse?.value || 0)
        };

        if (!payload.name || !payload.category || !Number.isFinite(payload.price) || payload.price < 0) {
            alert('Name, category and a valid price are required.');
            return;
        }
        if (
            !Number.isFinite(payload.stockOnHand)
            || payload.stockOnHand < 0
            || !Number.isFinite(payload.stockInWarehouse)
            || payload.stockInWarehouse < 0
        ) {
            alert('Stock values must be zero or greater.');
            return;
        }

        const id = this.app.state.currentPosEditId;
        const response = await fetch(id ? `/api/pos/products/${id}` : '/api/pos/products', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.error || 'Failed to save product');
            return;
        }

        this.close();
        await this.app.loadStockSection?.();
        await Promise.all([this.load(), this.refreshCatalog()]);
    }

    fields() {
        return {
            title: document.getElementById('posProductModalTitle'),
            name: document.getElementById('posProductName'),
            category: document.getElementById('posProductCategory'),
            size: document.getElementById('posProductSize'),
            sku: document.getElementById('posProductSku'),
            price: document.getElementById('posProductPrice'),
            stockOnHand: document.getElementById('posProductStockOnHand'),
            stockInWarehouse: document.getElementById('posProductStockWarehouse'),
            modal: document.getElementById('posProductModal')
        };
    }
}
