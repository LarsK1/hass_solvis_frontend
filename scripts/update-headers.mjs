#!/usr/bin/env node
/**
 * Updates version headers across project files during the release-please PR.
 *
 * - Version source: package.json version
 * - Date: current UTC date in YYYY-MM-DD
 * - README.md: ensures a line after the first H1: `## 1.2.3 — YYYY-MM-DD`
 * - JS/TS files: prepends or updates `// Version: 1.2.3 — YYYY-MM-DD`
 * - HTML files: prepends or updates `<!-- Version: 1.2.3 — YYYY-MM-DD -->`
 * - CHANGELOG.md: rewrites the top-most header line to `## 1.2.3 — YYYY-MM-DD`
 *
 * JSON files are not modified to keep valid JSON (release-please bumps versions there).
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function yyyymmddUTC(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const pkg = readJSON(path.join(repoRoot, 'package.json'));
const version = pkg.version;
if (!version) {
  console.error('package.json has no version. Abort.');
  process.exit(1);
}
const dateStr = yyyymmddUTC();

const jsTsHeader = `// Version: ${version} — ${dateStr}`;
const htmlHeader = `<!-- Version: ${version} — ${dateStr} -->`;
const mdHeader = `## ${version} — ${dateStr}`;

/**
 * Recursively collect files matching extensions under given directories.
 */
function collectFiles(dirs, exts) {
  const files = [];
  for (const dir of dirs) {
    walk(path.join(repoRoot, dir));
  }
  return files;

  function walk(p) {
    if (!fs.existsSync(p)) return;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(p)) {
        walk(path.join(p, entry));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(p).toLowerCase();
      if (exts.includes(ext)) files.push(p);
    }
  }
}

function upsertHeaderForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let content = fs.readFileSync(filePath, 'utf8');

  if (ext === '.md' && path.basename(filePath).toLowerCase() === 'readme.md') {
    const lines = content.split(/\r?\n/);
    let firstH1 = lines.findIndex(l => /^#\s+/.test(l));
    if (firstH1 === -1) firstH1 = 0;
    // Find existing version header right after H1
    const vhIndex = firstH1 + 1;
    const reHeader = /^##\s+\d+\.\d+\.\d+\s+—\s+\d{4}-\d{2}-\d{2}$/;
    if (lines[vhIndex] && reHeader.test(lines[vhIndex])) {
      lines[vhIndex] = mdHeader;
    } else {
      lines.splice(vhIndex, 0, mdHeader, '');
    }
    content = lines.join('\n');
    fs.writeFileSync(filePath, content);
    return true;
  }

  if (ext === '.md' && path.basename(filePath).toLowerCase() === 'changelog.md') {
    const lines = content.split(/\r?\n/);
    const firstH2 = lines.findIndex(l => /^##\s+/.test(l));
    if (firstH2 !== -1) {
      lines[firstH2] = mdHeader;
    } else {
      // Seed a basic changelog
      lines.unshift('# Changelog', '', mdHeader, '');
    }
    content = lines.join('\n');
    fs.writeFileSync(filePath, content);
    return true;
  }

  if (ext === '.js' || ext === '.ts') {
    const reJs = /^\s*\/\/\s*Version:\s*\d+\.\d+\.\d+\s+—\s+\d{4}-\d{2}-\d{2}\s*\r?\n/;
    if (reJs.test(content)) {
      content = content.replace(reJs, jsTsHeader + '\n');
    } else {
      content = jsTsHeader + '\n' + content;
    }
    fs.writeFileSync(filePath, content);
    return true;
  }

  if (ext === '.html') {
    const reHtml = /^\s*<!--\s*Version:\s*\d+\.\d+\.\d+\s+—\s+\d{4}-\d{2}-\d{2}\s*-->\s*\r?\n/;
    if (reHtml.test(content)) {
      content = content.replace(reHtml, htmlHeader + '\n');
    } else {
      // Keep DOCTYPE as the very first line to avoid quirks mode
      const doctypeMatch = content.match(/^\s*<!doctype\s+html>\s*\r?\n/i);
      if (doctypeMatch) {
        const rest = content.slice(doctypeMatch[0].length);
        content = doctypeMatch[0] + htmlHeader + '\n' + rest;
      } else {
        content = htmlHeader + '\n' + content;
      }
    }
    fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

// Target files roughly matching release artifacts (non-JSON):
const explicitFiles = [
  'solvis-card.js',
  'README.md',
  'playwright.config.ts',
  'CHANGELOG.md'
].map(p => path.join(repoRoot, p)).filter(p => fs.existsSync(p));

const collected = [
  ...collectFiles(['src'], ['.js']),
  ...collectFiles(['tests'], ['.ts', '.js', '.html']),
  ...collectFiles(['tests/demo'], ['.html'])
];

let changes = 0;
for (const f of [...new Set([...explicitFiles, ...collected])]) {
  const updated = upsertHeaderForFile(f);
  if (updated) changes++;
}

console.log(`Updated headers in ${changes} file(s) to version ${version} — ${dateStr}`);
