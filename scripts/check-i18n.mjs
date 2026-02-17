import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// i18n key convention (storage/description):
// - Display label key:    storage.<raw>
// - Description key:      description.<id>
// - Canonical <id>:       lowercase + trim + collapse whitespace (e.g. "WebDav" -> "webdav", "IPFS  API" -> "ipfs api")
// Runtime also adds alias keys for a few historical case variants to keep backward compatibility.
const LOCALES_DIR = path.resolve('src-tauri', 'locales');

function normalizeStorageId(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatKeyList(keys) {
  return keys.length <= 8 ? keys.join(', ') : `${keys.slice(0, 8).join(', ')}, ... (+${keys.length - 8})`;
}

async function loadJson(filePath) {
  const text = await readFile(filePath, 'utf8');
  return JSON.parse(text);
}

async function main() {
  const entries = await readdir(LOCALES_DIR, { withFileTypes: true });
  const localeFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => path.join(LOCALES_DIR, e.name))
    .sort((a, b) => a.localeCompare(b));

  if (localeFiles.length === 0) {
    console.error(`[check:i18n] No locale json files found under: ${LOCALES_DIR}`);
    process.exit(1);
  }

  let hasError = false;

  for (const filePath of localeFiles) {
    const localeName = path.basename(filePath);
    let json;
    try {
      json = await loadJson(filePath);
    } catch (e) {
      console.error(`[check:i18n] Failed to parse ${localeName}: ${e?.message ?? String(e)}`);
      hasError = true;
      continue;
    }

    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      console.error(`[check:i18n] ${localeName} must be a JSON object`);
      hasError = true;
      continue;
    }

    const keys = Object.keys(json);

    // 1) No empty strings
    const emptyKeys = keys.filter((k) => typeof json[k] === 'string' && json[k].trim() === '');
    if (emptyKeys.length > 0) {
      console.error(`[check:i18n] ${localeName}: empty strings found: ${formatKeyList(emptyKeys)}`);
      hasError = true;
    }

    // 2) storage.* must have description.<normalized id>
    const storageKeys = keys.filter((k) => k.startsWith('storage.'));
    const missingDescriptions = [];
    for (const storageKey of storageKeys) {
      const suffix = storageKey.slice('storage.'.length);
      const id = normalizeStorageId(suffix);
      const descKey = `description.${id}`;
      if (!isNonEmptyString(json[descKey])) {
        missingDescriptions.push(`${storageKey} -> ${descKey}`);
      }
    }
    if (missingDescriptions.length > 0) {
      console.error(
        `[check:i18n] ${localeName}: storage has but description missing (${missingDescriptions.length})`,
      );
      for (const item of missingDescriptions.slice(0, 60)) {
        console.error(`  - ${item}`);
      }
      if (missingDescriptions.length > 60) {
        console.error(`  ... (+${missingDescriptions.length - 60})`);
      }
      hasError = true;
    }

    // 3) Detect storage case/whitespace duplicates (same normalized id)
    const groups = new Map();
    for (const storageKey of storageKeys) {
      const suffix = storageKey.slice('storage.'.length);
      const id = normalizeStorageId(suffix);
      const group = groups.get(id) ?? [];
      group.push(suffix);
      groups.set(id, group);
    }
    const duplicates = [];
    for (const [id, rawSuffixes] of groups.entries()) {
      const unique = [...new Set(rawSuffixes)];
      if (unique.length > 1) {
        duplicates.push({ id, variants: unique.sort((a, b) => a.localeCompare(b)) });
      }
    }
    if (duplicates.length > 0) {
      console.warn(`[check:i18n] ${localeName}: storage key variants share the same id (${duplicates.length})`);
      for (const d of duplicates.slice(0, 30)) {
        console.warn(`  - ${d.id}: ${d.variants.join(' | ')}`);
      }
      if (duplicates.length > 30) {
        console.warn(`  ... (+${duplicates.length - 30})`);
      }
      // Do not fail for duplicates; normalize/alias layer handles compatibility.
    }
  }

  if (hasError) {
    process.exit(1);
  }
  console.log('[check:i18n] OK');
}

main().catch((e) => {
  console.error(`[check:i18n] Unexpected error: ${e?.stack ?? e?.message ?? String(e)}`);
  process.exit(1);
});
