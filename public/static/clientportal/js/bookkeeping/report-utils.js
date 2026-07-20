export function reportTotals(transactions) {
    const totals = { income: 0, expenses: 0 };
    transactions.forEach((transaction) => {
        const key = transaction.type === 'income' ? 'income' : 'expenses';
        totals[key] += Number(transaction.amount || 0);
    });
    return {
        ...totals,
        net: totals.income - totals.expenses
    };
}

function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadCsv(filename, rows) {
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
