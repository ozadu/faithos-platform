type CsvValue = boolean | Date | null | number | string | undefined;

export function toCsv<T extends Record<string, CsvValue>>(
  rows: T[],
  columns: Array<{ key: keyof T; label: string }>,
): string {
  const header = columns.map((column) => escapeCsv(column.label)).join(',');
  const body = rows.map((row) =>
    columns
      .map((column) => {
        const value = row[column.key];
        return escapeCsv(value instanceof Date ? value.toISOString() : value);
      })
      .join(','),
  );

  return [header, ...body].join('\n');
}

function escapeCsv(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
