export type I18nPack = Record<string, string>;

// Key convention for storage i18n:
// - Prefer canonical ids in code: `storage.<id>` and `description.<id>`
// - Canonical <id> is: lowercase + trim + collapse whitespace
// - Keep compatibility with historical case variants via alias keys.
function normalizeStorageId(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const STORAGE_KEY_ALIASES: Record<string, string> = {
  'storage.Alias': 'storage.alias',
  'storage.Crypt': 'storage.crypt',
  'storage.Dropbox': 'storage.dropbox',
  'storage.FTP': 'storage.ftp',
  'storage.Local': 'storage.local',
  'storage.Onedrive': 'storage.onedrive',
  'storage.PikPak': 'storage.pikpak',
  'storage.S3': 'storage.s3',
  'storage.SFTP': 'storage.sftp',
  'storage.SMB': 'storage.smb',
  'storage.Seafile': 'storage.seafile',
  'storage.WebDav': 'storage.webdav',
};

export function normalizeI18nPack(pack: I18nPack): I18nPack {
  const out: I18nPack = { ...pack };

  for (const [key, value] of Object.entries(pack)) {
    if (typeof value !== 'string') continue;

    if (key.startsWith('storage.')) {
      const suffix = key.slice('storage.'.length);
      const canonical = `storage.${normalizeStorageId(suffix)}`;
      if (!(canonical in out)) out[canonical] = value;
      continue;
    }

    if (key.startsWith('description.')) {
      const suffix = key.slice('description.'.length);
      const canonical = `description.${normalizeStorageId(suffix)}`;
      if (!(canonical in out)) out[canonical] = value;
      continue;
    }
  }

  for (const [aliasKey, canonicalKey] of Object.entries(STORAGE_KEY_ALIASES)) {
    if (!(aliasKey in out) && canonicalKey in out) {
      out[aliasKey] = out[canonicalKey]!;
    }
  }

  return out;
}
