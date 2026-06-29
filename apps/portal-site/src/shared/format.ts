const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
});

export function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

export function formatDateTime(value: string): string {
    return dateTimeFormatter.format(new Date(value));
}
