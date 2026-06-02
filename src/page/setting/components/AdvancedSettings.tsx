/**
 * Advanced Settings Component
 * 高级设置组件（网络代理、启动参数）
 */

import { Button, Collapse, Form, Input, InputNumber, Message, Modal, Select } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { nmConfig, saveNmConfig } from '../../../services/ConfigService'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import { clearAllCache } from '../../../utils/tempCleanup'

const FormItem = Form.Item

/**
 * 验证主机名格式（允许IP地址、域名、localhost）
 */
function isValidHostname(hostname: string): boolean {
  if (!hostname) return false
  // 允许: IP地址、域名、localhost
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$/
  return hostnameRegex.test(hostname)
}

export function AdvancedSettings(): JSX.Element {
  const { t } = useTranslation()
  const { increment: incrementSettings } = useSettingsStore()

  const proxy = nmConfig.settings.proxy
  const proxyType = proxy?.type || 'no_proxy'

  return (
    <Form autoComplete="off" style={{ paddingRight: '0.8rem' }}>
      <Collapse bordered={false} style={{ marginBottom: '0.75rem' }}>
        <Collapse.Item name="proxy_settings" header={t('proxy_settings')}>
          <FormItem label={t('proxy_type')}>
            <Select
              value={proxyType}
              onChange={value => {
                if (value === 'no_proxy') {
                  nmConfig.settings.proxy = undefined
                } else {
                  nmConfig.settings.proxy = {
                    type: value as 'http' | 'socks5',
                    host: proxy?.host || '',
                    port: proxy?.port || (value === 'socks5' ? 1080 : 8080),
                    username: proxy?.username,
                    password: proxy?.password,
                  }
                }
                incrementSettings()
              }}
              style={{ width: '12rem' }}
            >
              <Select.Option value="no_proxy">{t('no_proxy')}</Select.Option>
              <Select.Option value="http">HTTP</Select.Option>
              <Select.Option value="socks5">SOCKS5</Select.Option>
            </Select>
          </FormItem>

          {proxyType !== 'no_proxy' && (
            <>
              <FormItem label={t('proxy_host')}>
                <Input
                  value={proxy?.host || ''}
                  placeholder={t('proxy_host_placeholder')}
                  onChange={value => {
                    if (nmConfig.settings.proxy) {
                      nmConfig.settings.proxy.host = value
                      incrementSettings()
                    }
                  }}
                  onBlur={e => {
                    const value = e.target.value
                    if (value && !isValidHostname(value)) {
                      Message.warning(t('proxy_host_invalid'))
                    }
                  }}
                />
              </FormItem>
              <FormItem label={t('proxy_port')}>
                <InputNumber
                  value={proxy?.port}
                  min={1}
                  max={65535}
                  placeholder={t('proxy_port_placeholder')}
                  onChange={value => {
                    if (nmConfig.settings.proxy) {
                      nmConfig.settings.proxy.port = value || undefined
                      incrementSettings()
                    }
                  }}
                  style={{ width: '12rem' }}
                />
              </FormItem>
              <FormItem label={t('proxy_username')}>
                <Input
                  value={proxy?.username || ''}
                  placeholder={t('optional')}
                  onChange={value => {
                    if (nmConfig.settings.proxy) {
                      nmConfig.settings.proxy.username = value || undefined
                      incrementSettings()
                    }
                  }}
                />
              </FormItem>
              <FormItem label={t('proxy_password')}>
                <Input.Password
                  value={proxy?.password || ''}
                  placeholder={t('optional')}
                  onChange={value => {
                    if (nmConfig.settings.proxy) {
                      nmConfig.settings.proxy.password = value || undefined
                      incrementSettings()
                    }
                  }}
                />
              </FormItem>
            </>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
            {t('proxy_settings_hint')}
          </div>
        </Collapse.Item>

        <Collapse.Item name="extra_startup_args" header={t('extra_startup_args')}>
          <FormItem label={'Rclone'}>
            <Input
              value={nmConfig.framework.rclone.extraArgs || ''}
              placeholder="e.g. --log-level=DEBUG --rc-enable-metrics"
              onChange={value => {
                nmConfig.framework.rclone.extraArgs = value
                incrementSettings()
              }}
            />
          </FormItem>
          <FormItem label={'OpenList'}>
            <Input
              value={nmConfig.framework.openlist.extraArgs || ''}
              placeholder="e.g. --log.level=debug"
              onChange={value => {
                nmConfig.framework.openlist.extraArgs = value
                incrementSettings()
              }}
            />
          </FormItem>
        </Collapse.Item>
      </Collapse>

      <div style={{ marginBottom: '0.75rem' }}>
        <Button
          status="warning"
          onClick={() => {
            Modal.confirm({
              title: t('clear_cache'),
              content: t('clear_cache_confirm'),
              onOk: async () => {
                const success = await clearAllCache()
                if (success) {
                  Message.success(t('cache_cleared'))
                } else {
                  Message.warning(t('no_cache_to_clear'))
                }
              },
            })
          }}
        >
          {t('clear_cache')}
        </Button>
      </div>

      <div style={{ width: '100%', textAlign: 'right' }}>
        <Button
          type="primary"
          onClick={async () => {
            await saveNmConfig()
            Message.success(t('saved'))
          }}
        >
          {t('save')}
        </Button>
      </div>
    </Form>
  )
}
