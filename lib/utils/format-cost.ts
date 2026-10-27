// USD estimates: trailing zeros are trimmed and values below the shown precision stay visible.
export function formatCost(value: number | null, precision = 2): string {
    if (value === null || !Number.isFinite(value)) {
        return '—';
    }
    if (value === 0) {
        return '$0';
    }
    const minimum = 10 ** -precision;
    if (value < minimum) {
        return `<$${minimum.toFixed(precision)}`;
    }

    const formatted = value
        .toFixed(precision)
        .replace(/(\.\d*?[1-9])0+$/, '$1')
        .replace(/\.0+$/, '');

    return `$${formatted}`;
}
