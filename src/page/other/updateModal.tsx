import { t } from 'i18next';
import type { ReactNode } from 'react';

export function createUpdateAvailableContent(version: string, body?: string): ReactNode {
  return (
    <div>
      <p style={{ marginBottom: 12 }}>
        {t('new_version_available')}: v{version}
      </p>
      {body && (
        <div
          style={{
            maxHeight: 200,
            overflow: 'auto',
            background: 'var(--color-fill-1)',
            padding: 12,
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {formatReleaseNotes(body)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function createDownloadingContent(downloaded: number, total: number): ReactNode {
  return (
    <div>
      <p style={{ marginBottom: 8 }}>{t('downloading')}...</p>
      <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>
        {total > 0
          ? `${formatBytes(downloaded)} / ${formatBytes(total)} (${Math.round((downloaded / total) * 100)}%)`
          : formatBytes(downloaded)}
      </p>
    </div>
  );
}

export function createDownloadedAndRestartingContent(): ReactNode {
  return (
    <div>
      <p>{t('download_complete')}</p>
      <p style={{ color: 'var(--color-text-3)', fontSize: 13 }}>{t('restarting_app')}</p>
    </div>
  );
}

function formatReleaseNotes(body: string): string {
  return body
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

