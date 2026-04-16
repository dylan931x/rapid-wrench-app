export function formatMoney(value: number | string | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}
