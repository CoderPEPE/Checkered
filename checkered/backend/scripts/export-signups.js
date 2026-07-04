#!/usr/bin/env node
// Prints alpha signups as CSV to stdout, for pasting into a spreadsheet:
//   node scripts/export-signups.js > signups.csv
// Reads the same file the API writes (override with SIGNUPS_FILE).
const fs = require("fs");
const path = require("path");

const FILE = process.env.SIGNUPS_FILE || path.join(__dirname, "..", "data", "alpha-signups.json");
const COLUMNS = [
  "name",
  "iracingName",
  "iracingCustomerId",
  "irating",
  "email",
  "discord",
  "availability",
  "timestamp",
];

let signups = [];
try {
  signups = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  process.stderr.write(`No signups found at ${FILE}\n`);
  process.exit(0);
}

// Quote fields containing commas/quotes/newlines, doubling any inner quotes.
const esc = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rows = [COLUMNS.join(",")];
for (const s of signups) rows.push(COLUMNS.map((c) => esc(s[c])).join(","));
process.stdout.write(rows.join("\n") + "\n");
