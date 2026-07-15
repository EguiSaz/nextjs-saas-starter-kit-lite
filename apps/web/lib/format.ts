const moneyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

export function formatMoney(value: number | string | null | undefined) {
  return moneyFormatter.format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value + 'T00:00:00');
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
