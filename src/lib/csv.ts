// Minimal CSV writer for exports. Cells that a spreadsheet could interpret as a formula (=, +, -, @) are prefixed
// with an apostrophe: visitor-supplied text must never become a formula in the admin's Excel or Sheets (CSV injection).

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // A phone number such as "+33 6 12 34 56 78" is harmless (digits and phone punctuation only): keep it readable.
  const isPhone = /^\+[\d\s().-]{5,}$/.test(text);
  if (!isPhone && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// A leading byte order mark makes Excel open the file as UTF-8 (accents stay readable).
export function toCsv(rows: unknown[][]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
