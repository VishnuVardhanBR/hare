const REQUIRED_BULK_HEADERS = ["company", "domain", "email", "recruiter_name"] as const;
const OPTIONAL_BULK_HEADERS = ["title", "department"] as const;
const ALLOWED_BULK_HEADERS = [...REQUIRED_BULK_HEADERS, ...OPTIONAL_BULK_HEADERS] as const;

export { ALLOWED_BULK_HEADERS, OPTIONAL_BULK_HEADERS, REQUIRED_BULK_HEADERS };

export type ParsedCsvRow = {
  rowNumber: number;
  values: Record<string, string>;
};

export function parseCsv(raw: string): { headers: string[]; rows: ParsedCsvRow[] } {
  const lines = raw
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(",").map((cell) => cell.trim().toLowerCase());

  const rows = lines.slice(1).map((line, index) => {
    const values = line.split(",").map((cell) => cell.trim());
    const record = Object.fromEntries(
      headers.map((header, valueIndex) => [header, values[valueIndex] ?? ""])
    );

    return {
      rowNumber: index + 2,
      values: record
    };
  });

  return { headers, rows };
}
