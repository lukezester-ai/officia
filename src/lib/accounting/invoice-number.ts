export function chooseInvoiceNumber(
  requested: string,
  existing: Array<string | null | undefined>,
): string {
  const taken = new Set(
    existing.map((value) => (value ?? '').trim()).filter((value) => value.length > 0),
  );
  const wanted = requested.trim().slice(0, 40);
  if (wanted && !taken.has(wanted)) return wanted;

  let max = 0;
  for (const value of taken) {
    if (!/^\d{1,10}$/.test(value)) continue;
    max = Math.max(max, Number(value));
  }

  for (let n = max + 1; n <= 9_999_999_999; n += 1) {
    const candidate = String(n).padStart(10, '0');
    if (!taken.has(candidate)) return candidate;
  }

  throw new Error('Няма свободен номер на фактура');
}
