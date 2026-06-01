/**
 * Data Management Component
 * 数据管理组件（导入/导出配置、导入 alist 配置）
 */

import { useState } from 'react'
import { Button, Message, Modal, Space, Tooltip, Progress } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import * as dialog from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { importAlistConfig } from '../../../services/storage/AlistImportService'

export function DataManagement(): JSX.Element {
  const { t } = useTranslation()
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })

  const handleExport = async () => {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const path = await dialog.save({
        title: t('export_config'),
        defaultPath: `netmount-config-${ts}.zip`,
        filters: [{ name: 'Zip', extensions: ['zip'] }],
      })
      if (!path) return
      const out = await invoke<string>('export_config', { outPath: path })
      Message.success(`${t('config_exported')}: ${out}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Message.error(msg)
    }
  }

  const handleImport = async () => {
    try {
      const path = await dialog.open({
        title: t('import_config'),
        multiple: false,
        filters: [{ name: 'Zip', extensions: ['zip'] }],
      })
      if (!path) return

      Modal.confirm({
        title: t('confirm_import'),
        content: t('confirm_import_description'),
        okButtonProps: { status: 'warning' },
        onOk: async () => {
          try {
            await invoke('stop_components')
            await new Promise(resolve => setTimeout(resolve, 500))
            const result = await invoke<string>('import_config', { zipPath: path })
            Message.success(result)
            setTimeout(() => {
              invoke('restart_self')
            }, 1000)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            Message.error(msg)
          }
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Message.error(msg)
    }
  }

  const handleImportAlist = async () => {
    try {
      const path = await dialog.open({
        title: t('import_alist_config'),
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (!path) return

      Modal.confirm({
        title: t('confirm_import_alist'),
        content: t('confirm_import_alist_description'),
        okButtonProps: { status: 'warning' },
        onOk: async () => {
          setImporting(true)
          setImportProgress({ current: 0, total: 0 })

          try {
            // 读取 JSON 文件（返回已解析的 JSON 对象）
            const jsonData = await invoke<unknown>('read_json_file', { path })

            // 调用导入服务
            const result = await importAlistConfig(
              jsonData as Parameters<typeof importAlistConfig>[0],
              (current, total) => {
                setImportProgress({ current, total })
              }
            )

            // 显示结果
            if (result.success > 0) {
              Message.success(
                t('alist_import_success', {
                  success: result.success,
                  total: result.total,
                })
              )
            }

            if (result.failed > 0) {
              const errorDetails = result.errors
                .map(e => `${e.name}: ${e.error}`)
                .join('\n')
              Message.warning(
                t('alist_import_partial', {
                  success: result.success,
                  failed: result.failed,
                  total: result.total,
                })
              )
              console.warn('Alist import errors:', errorDetails)
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            Message.error(msg)
          } finally {
            setImporting(false)
            setImportProgress({ current: 0, total: 0 })
          }
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      Message.error(msg)
    }
  }

  return (
    <Space direction="vertical" size="medium" style={{ width: '100%' }}>
      {/* NetMount 配置导入导出 */}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{t('export_import_config_description')}</span>
        </div>
        <Space>
          <Tooltip content={t('export_config_description')}>
            <Button type="text" status="success" onClick={handleExport}>
              {t('export')}
            </Button>
          </Tooltip>
          <Tooltip content={t('import_config_description')}>
            <Button type="text" status="warning" onClick={handleImport}>
              {t('import')}
            </Button>
          </Tooltip>
        </Space>
      </Space>

      {/* alist 配置导入 */}
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{t('import_alist_config_description')}</span>
        </div>
        <Space>
          <Tooltip content={t('import_alist_config_tip')}>
            <Button
              type="text"
              status="warning"
              onClick={handleImportAlist}
              loading={importing}
              disabled={importing}
            >
              {t('import_alist_config')}
            </Button>
          </Tooltip>
        </Space>
      </Space>

      {/* 导入进度 */}
      {importing && importProgress.total > 0 && (
        <div style={{ width: '100%' }}>
            <Progress
            percent={Math.round((importProgress.current / importProgress.total) * 100)}
            status="normal"
            formatText={() => `${importProgress.current} / ${importProgress.total}`}
          />
        </div>
      )}
    </Space>
  )
}
