import { useEffect, useReducer, useState } from 'react'
import { Button, Card, Form, Grid, Input, Link, Message, Modal, Select, Space, Switch } from '@arco-design/web-react'
import { nmConfig, osInfo, roConfig, saveNmConfig } from '../../services/config';
import { getAutostartState, setAutostartState, setThemeMode } from '../../controller/setting/setting';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import * as shell from '@tauri-apps/plugin-shell';
import { rcloneInfo } from '../../services/rclone';
import { setLocalized } from '../../controller/language/localized';
import { formatPath, openUrlInBrowser, set_devtools_state, showPathInExplorer } from '../../utils/utils';
import { showLog } from '../other/modal';
import { openlistInfo } from '../../services/openlist';
import * as dialog from '@tauri-apps/plugin-dialog';
import { exit } from '../../controller/main';
import { readTextFileTail } from '../../utils/logs';
import { invoke } from '@tauri-apps/api/core';
import { netmountLogDir, openlistLogFile, rcloneLogFile } from '../../utils/netmountPaths';

// const CollapseItem = Collapse.Item;
const FormItem = Form.Item;
const Row = Grid.Row;
const Col = Grid.Col;

export default function Setting_page() {
  const { t } = useTranslation()
  const [autostart, setAutostart] = useState<boolean>()
  const [modal, contextHolder] = Modal.useModal();
  const [, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
  const [version, setVersion] = useState<string>()

  const showLogFromFileTail = async (path: string) => {
    try {
      const content = await readTextFileTail(path, { maxBytes: 256 * 1024, allowMissing: true })
      showLog(modal, (content || '').trim() ? content : '暂无日志')
    } catch (e) {
      const msg = (() => {
        if (typeof e === 'string') return e
        if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
          return (e as { message: string }).message
        }
        try {
          return JSON.stringify(e)
        } catch {
          return String(e)
        }
      })()
      Message.error(msg)
    }
  }

  const getInfo = async () => {
    setAutostart(await getAutostartState());
    setVersion(await getVersion())
  }



  useEffect(() => {
    getInfo()
  }, [])



  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        <Card title={t('setting')} style={{}} size='small'>
          <Form autoComplete='off' style={{ paddingRight: '0.8rem' }}>
            <FormItem label={t('language')}>
              <Select
                defaultValue={nmConfig.settings.language || ''}
                onChange={async (value) => {
                  nmConfig.settings.language = value
                  await saveNmConfig()
                  await setLocalized(nmConfig.settings.language!)
                }}
                style={{ width: '8rem' }}
              >
                {roConfig.options.setting.language.select.map((item, index) => {
                  return (
                    <Select.Option key={index} value={item.value}>{item.name}</Select.Option>
                  )
                })}
              </Select>
            </FormItem>
            <FormItem label={t('theme_mode')}>
              <Select
                defaultValue={nmConfig.settings.themeMode || 'auto'}
                onChange={(value) => {
                  nmConfig.settings.themeMode = value;
                  setThemeMode(value);
                }}
                style={{ width: '8rem' }}
              >
                {roConfig.options.setting.themeMode.select.map((item, index) => {
                  return (
                    <Select.Option key={index} value={item}>{t(`${item}_themeMode`)}</Select.Option>
                  )
                })}
              </Select>
            </FormItem>
            <FormItem label={t('autostart')}>
              <Switch checked={autostart || false} /* disabled={osInfo.osType==='Darwin'} */ onChange={async (value) => {
                await setAutostartState(value);
                setAutostart(value)
              }} />

            </FormItem>
            <FormItem label={t('start_hide')}>
              <Switch checked={nmConfig.settings.startHide} onChange={async (value) => {
                nmConfig.settings.startHide = value
                forceUpdate()
              }} />
            </FormItem>
            <FormItem label={t('auto_recover_components')}>
              <Switch checked={nmConfig.settings.autoRecoverComponents} onChange={(value) => {
                nmConfig.settings.autoRecoverComponents = value
                forceUpdate()
              }} />
            </FormItem>
            <FormItem label={t('cache_path')}>
              <Input.Group compact>
                <Input style={{ width: 'calc(100% - 4rem)' }} value={nmConfig.settings.path.cacheDir || ''} />
                <Button style={{ width: '4rem' }} onClick={async () => {
                  let dirPath = await dialog.open({
                    title: t('please_select_cache_dir'),
                    multiple: false,
                    directory: true,
                    defaultPath: nmConfig.settings.path.cacheDir || ''
                  });
                  dirPath = dirPath ? formatPath(dirPath, osInfo.platform === 'windows') : dirPath
                  if (dirPath && dirPath !== nmConfig.settings.path.cacheDir) {
                    nmConfig.settings.path.cacheDir = dirPath
                    forceUpdate()

                    Modal.confirm({
                      title: t('ask_restartself'),
                      content: t('after_changing_the_cache_directory_tips'),
                      onOk: () => {
                        exit(true)
                      },
                    });
                  }
                }}>{t('select')}</Button>
              </Input.Group>

            </FormItem>

            <div style={{ width: '100%', textAlign: 'right' }}><Button type='primary' onClick={async () => {
              await saveNmConfig()
              Message.success(t('saved'))
            }}>{t('save')}</Button></div>
          </Form>


        </Card>
        <Card title={t('data_management')} style={{}} size='small'>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>{t('export_config')}</div>
                <div style={{ fontSize: '0.85rem', color: '#86909c' }}>
                  {t('export_config_description')}
                </div>
              </div>
              <Button type="primary" status="success" onClick={async () => {
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
                  const msg = (() => {
                    if (typeof e === 'string') return e
                    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
                      return (e as { message: string }).message
                    }
                    try {
                      return JSON.stringify(e)
                    } catch {
                      return String(e)
                    }
                  })()
                  Message.error(msg)
                }
              }}>{t('export')}</Button>
            </div>
            
            <div style={{ height: '1px', backgroundColor: '#e5e6eb', margin: '0.5rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>{t('import_config')}</div>
                <div style={{ fontSize: '0.85rem', color: '#86909c' }}>
                  {t('import_config_description')}
                </div>
              </div>
              <Button type="primary" status="warning" onClick={async () => {
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
                        const result = await invoke<string>('import_config', { zipPath: path })
                        Message.success(result)
                        // 延迟重启
                        setTimeout(() => {
                          exit(true)
                        }, 1000)
                      } catch (e) {
                        const msg = (() => {
                          if (typeof e === 'string') return e
                          if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
                            return (e as { message: string }).message
                          }
                          try {
                            return JSON.stringify(e)
                          } catch {
                            return String(e)
                          }
                        })()
                        Message.error(msg)
                      }
                    },
                  })
                } catch (e) {
                  const msg = (() => {
                    if (typeof e === 'string') return e
                    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
                      return (e as { message: string }).message
                    }
                    try {
                      return JSON.stringify(e)
                    } catch {
                      return String(e)
                    }
                  })()
                  Message.error(msg)
                }
              }}>{t('import')}</Button>
            </div>
          </Space>
        </Card>
        <Card title={t('components')} style={{}} size='small'>
          <Link onClick={() => { shell.open(roConfig.url.rclone) }}>Rclone</Link>(<Link onClick={() => {
            if ((rcloneInfo.process.log || '').trim()) {
              showLog(modal, rcloneInfo.process.log!)
              return
            }
            showLogFromFileTail(rcloneInfo.process.logFile || rcloneLogFile())
          }}>{t('log')}</Link>): {rcloneInfo.version.version}
          <br />
          <Link onClick={() => { shell.open(roConfig.url.openlist) }}>Openlist</Link>(<Link onClick={() => {
            if ((openlistInfo.process.log || '').trim()) {
              showLog(modal, openlistInfo.process.log!)
              return
            }
            showLogFromFileTail(openlistInfo.process.logFile || openlistLogFile())
          }}>{t('log')}</Link>): {openlistInfo.version.version}
          <br />
          <Space style={{ marginTop: '0.5rem' }}>
            <Button onClick={async () => {
              const dir = netmountLogDir()
              if (osInfo.platform === 'windows') {
                const ok = await showPathInExplorer(dir, true)
                if (!ok) {
                  Message.error(dir)
                }
              } else {
                Message.info(dir)
              }
            }}>{t('open_log_dir')}</Button>
            <Button onClick={async () => {
              try {
                const ts = new Date().toISOString().replace(/[:.]/g, '-')
                const path = await dialog.save({
                  title: t('export_diagnostics'),
                  defaultPath: `netmount-diagnostics-${ts}.zip`,
                  filters: [{ name: 'Zip', extensions: ['zip'] }],
                })
                if (!path) return
                const out = await invoke<string>('export_diagnostics', { outPath: path })
                Message.success(`${t('diagnostics_exported')}: ${out}`)
              } catch (e) {
                const msg = (() => {
                  if (typeof e === 'string') return e
                  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
                    return (e as { message: string }).message
                  }
                  try {
                    return JSON.stringify(e)
                  } catch {
                    return String(e)
                  }
                })()
                Message.error(msg)
              }
            }}>{t('export_diagnostics')}</Button>
          </Space>
        </Card>
        <Card title={t('about')} style={{}} size='small'>
          <Row >
            <Col flex={'auto'} >
              {t('version')}: v{version}
              <br />
              {t('about_text')}
              <br />
              {/* {t('technology_stack')}:Tauri,TypeScript,Vite,React,Arco Design,Rust
              <br /> */}
              Copyright © 2024-Present
              <Link onClick={() => { openUrlInBrowser(roConfig.url.vhbBlog) }}>VirtualHotBar </Link>
            </Col>
            <Col flex={'10rem'} style={{ textAlign: 'right' }}>
              <Link onClick={() => { openUrlInBrowser(roConfig.url.website) }}> NetMount </Link>
              <br />
              <Link onClick={() => { openUrlInBrowser(roConfig.url.docs) }}> {t('docs')} </Link>
              <br />
              <Link onClick={() => { openUrlInBrowser(roConfig.url.docs + '/license') }}> {t('licence')} </Link>
              <br />
            </Col>
          </Row>
        </Card>
        <Card title={t('tools')} style={{}} size='small'>
          <Space>
            <Button onClick={async () => { await set_devtools_state(true) }}>{t('devtools')}</Button>
          </Space>

        </Card>
      </Space>
    </div>
  )
}
