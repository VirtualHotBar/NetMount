/**
 * Advanced Settings Component
 * 高级设置组件（启动参数）
 */

import { Button, Collapse, Form, Input, Message, Modal } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { nmConfig, saveNmConfig } from '../../../services/ConfigService'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import { clearAllCache } from '../../../utils/tempCleanup'

const FormItem = Form.Item

export function AdvancedSettings(): JSX.Element {
  const { t } = useTranslation()
  const { increment: incrementSettings } = useSettingsStore()

  return (
    <Form autoComplete="off" style={{ paddingRight: '0.8rem' }}>
      <Collapse bordered={false} style={{ marginBottom: '0.75rem' }}>
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
