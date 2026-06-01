/**
 * General Settings Component
 * 通用设置组件
 */

import { useEffect, useState } from 'react'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Switch,
} from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import * as dialog from '@tauri-apps/plugin-dialog'
import {
  getAutostartState,
  getAutostartMode,
  setAutostartMode,
  isTaskSchedulerAvailable,
  setThemeMode,
} from '../../../controller/setting/setting'
import { setLocalized } from '../../../controller/language/localized'
import { nmConfig, roConfig, saveNmConfig, osInfo } from '../../../services/ConfigService'
import { formatPath } from '../../../utils'
import { exit } from '../../../controller/main'
import { useSettingsStore } from '../../../stores/useSettingsStore'

const FormItem = Form.Item

/**
 * 简单的密码哈希函数（用于本地存储，非安全场景）
 */
function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return hash.toString(36)
}

export function GeneralSettings(): JSX.Element {
  const { t } = useTranslation()
  const [autostartMode, setAutostartModeState] = useState<string>('none')
  const [taskSchedulerAvailable, setTaskSchedulerAvailable] = useState<boolean>(false)
  const { increment: incrementSettings } = useSettingsStore()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    // Load autostart mode and task scheduler availability
    Promise.all([
      getAutostartMode(),
      isTaskSchedulerAvailable(),
    ]).then(([mode, available]) => {
      setAutostartModeState(mode)
      setTaskSchedulerAvailable(available)
    }).catch(() => {
      // Fallback: check basic autostart state
      getAutostartState().then(() => {})
    })
  }, [])

  const handleSetPassword = async () => {
    if (!newPassword) {
      // 清除密码
      if (!nmConfig.settings.security) {
        nmConfig.settings.security = {}
      }
      nmConfig.settings.security.startupPassword = undefined
      await saveNmConfig()
      Message.success(t('password_cleared'))
      setShowPasswordModal(false)
      return
    }

    if (newPassword !== confirmPassword) {
      Message.error(t('password_mismatch'))
      return
    }

    if (newPassword.length < 4) {
      Message.error(t('password_too_short'))
      return
    }

    if (!nmConfig.settings.security) {
      nmConfig.settings.security = {}
    }
    nmConfig.settings.security.startupPassword = hashPassword(newPassword)
    await saveNmConfig()
    Message.success(t('password_set'))
    setShowPasswordModal(false)
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <Form autoComplete="off" style={{ paddingRight: '0.8rem' }}>
      <FormItem label={t('language')}>
        <Select
          defaultValue={nmConfig.settings.language || ''}
          onChange={async value => {
            nmConfig.settings.language = value
            await saveNmConfig()
            await setLocalized(nmConfig.settings.language!)
          }}
          style={{ width: '8rem' }}
        >
          {roConfig.options.setting.language.select.map((item, index) => {
            return (
              <Select.Option key={index} value={item.value}>
                {item.name}
              </Select.Option>
            )
          })}
        </Select>
      </FormItem>
      <FormItem label={t('theme_mode')}>
        <Select
          defaultValue={nmConfig.settings.themeMode || 'auto'}
          onChange={value => {
            nmConfig.settings.themeMode = value
            setThemeMode(value)
          }}
          style={{ width: '8rem' }}
        >
          {roConfig.options.setting.themeMode.select.map((item, index) => {
            return (
              <Select.Option key={index} value={item}>
                {t(`${item}_themeMode`)}
              </Select.Option>
            )
          })}
        </Select>
      </FormItem>
      <FormItem label={t('autostart')}>
        <Select
          value={autostartMode}
          onChange={async value => {
            const success = await setAutostartMode(value as 'none' | 'registry' | 'task_scheduler')
            if (success) {
              setAutostartModeState(value)
            }
          }}
          style={{ width: '14rem' }}
        >
          <Select.Option value="none">{t('autostart_disabled')}</Select.Option>
          <Select.Option value="registry">{t('autostart_standard')}</Select.Option>
          {taskSchedulerAvailable && (
            <Select.Option value="task_scheduler">{t('autostart_high_priority')}</Select.Option>
          )}
        </Select>
      </FormItem>
      <FormItem label={t('start_hide')}>
        <Switch
          checked={nmConfig.settings.startHide}
          onChange={async value => {
            nmConfig.settings.startHide = value
            incrementSettings()
          }}
        />
      </FormItem>
      <FormItem label={t('auto_recover_components')}>
        <Switch
          checked={nmConfig.settings.autoRecoverComponents}
          onChange={value => {
            nmConfig.settings.autoRecoverComponents = value
            incrementSettings()
          }}
        />
      </FormItem>
      <FormItem label={t('cache_path')}>
        <Input.Group compact>
          <Input
            style={{ width: 'calc(100% - 4rem)' }}
            value={nmConfig.settings.path.cacheDir || ''}
          />
          <Button
            style={{ width: '4rem' }}
            onClick={async () => {
              let dirPath = await dialog.open({
                title: t('please_select_cache_dir'),
                multiple: false,
                directory: true,
                defaultPath: nmConfig.settings.path.cacheDir || '',
              })
              dirPath = dirPath ? formatPath(dirPath, osInfo.platform === 'windows') : dirPath
              if (dirPath && dirPath !== nmConfig.settings.path.cacheDir) {
                nmConfig.settings.path.cacheDir = dirPath
                incrementSettings()

                Modal.confirm({
                  title: t('ask_restartself'),
                  content: t('after_changing_the_cache_directory_tips'),
                  onOk: () => {
                    exit(true)
                  },
                })
              }
            }}
          >
            {t('select')}
          </Button>
        </Input.Group>
      </FormItem>

      <FormItem label={t('log_dir')}>
        <Input.Group compact>
          <Input
            style={{ width: 'calc(100% - 4rem)' }}
            value={nmConfig.settings.path.logDir || ''}
            placeholder={t('default') + ': ~/.netmount/log/'}
          />
          <Button
            style={{ width: '4rem' }}
            onClick={async () => {
              let dirPath = await dialog.open({
                title: t('please_select_log_dir'),
                multiple: false,
                directory: true,
                defaultPath: nmConfig.settings.path.logDir || '',
              })
              dirPath = dirPath ? formatPath(dirPath, osInfo.platform === 'windows') : dirPath
              if (dirPath && dirPath !== nmConfig.settings.path.logDir) {
                nmConfig.settings.path.logDir = dirPath
                incrementSettings()

                Modal.confirm({
                  title: t('ask_restartself'),
                  content: t('after_changing_the_log_directory_tips'),
                  onOk: () => {
                    exit(true)
                  },
                })
              }
            }}
          >
            {t('select')}
          </Button>
        </Input.Group>
      </FormItem>

      <FormItem label={t('transfer_dir')}>
        <Input.Group compact>
          <Input
            style={{ width: 'calc(100% - 4rem)' }}
            value={nmConfig.settings.path.transferDir || ''}
            placeholder={t('default') + ': {cacheDir}/rclone-temp/'}
          />
          <Button
            style={{ width: '4rem' }}
            onClick={async () => {
              let dirPath = await dialog.open({
                title: t('please_select_transfer_dir'),
                multiple: false,
                directory: true,
                defaultPath: nmConfig.settings.path.transferDir || '',
              })
              dirPath = dirPath ? formatPath(dirPath, osInfo.platform === 'windows') : dirPath
              if (dirPath && dirPath !== nmConfig.settings.path.transferDir) {
                nmConfig.settings.path.transferDir = dirPath
                incrementSettings()

                Modal.confirm({
                  title: t('ask_restartself'),
                  content: t('after_changing_the_transfer_directory_tips'),
                  onOk: () => {
                    exit(true)
                  },
                })
              }
            }}
          >
            {t('select')}
          </Button>
        </Input.Group>
      </FormItem>

      <FormItem label={t('startup_password')}>
        <Button
          onClick={() => setShowPasswordModal(true)}
        >
          {nmConfig.settings.security?.startupPassword ? t('change_password') : t('set_password')}
        </Button>
        {nmConfig.settings.security?.startupPassword && (
          <Button
            style={{ marginLeft: '0.5rem' }}
            status="danger"
            onClick={async () => {
              if (!nmConfig.settings.security) {
                nmConfig.settings.security = {}
              }
              nmConfig.settings.security.startupPassword = undefined
              await saveNmConfig()
              Message.success(t('password_cleared'))
            }}
          >
            {t('clear_password')}
          </Button>
        )}
      </FormItem>

      {nmConfig.settings.security?.startupPassword && (
        <>
          <FormItem label={t('lock_on_sleep')}>
            <Switch
              checked={nmConfig.settings.security?.lockOnSleep || false}
              onChange={value => {
                if (!nmConfig.settings.security) {
                  nmConfig.settings.security = {}
                }
                nmConfig.settings.security.lockOnSleep = value
                incrementSettings()
              }}
            />
          </FormItem>
          <FormItem label={t('idle_timeout')}>
            <InputNumber
              mode="button"
              min={0}
              max={1440}
              step={5}
              value={nmConfig.settings.security?.idleTimeoutMinutes || 0}
              onChange={value => {
                if (!nmConfig.settings.security) {
                  nmConfig.settings.security = {}
                }
                nmConfig.settings.security.idleTimeoutMinutes = value || 0
                incrementSettings()
              }}
              placeholder="0"
              suffix={t('minute')}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
              {t('idle_timeout_hint')}
            </div>
          </FormItem>
        </>
      )}

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

      <Modal
        title={t('set_startup_password')}
        visible={showPasswordModal}
        onOk={handleSetPassword}
        onCancel={() => {
          setShowPasswordModal(false)
          setNewPassword('')
          setConfirmPassword('')
        }}
        okText={t('save')}
        cancelText={t('step_back')}
      >
        <Form autoComplete="off">
          <FormItem label={t('new_password')}>
            <Input.Password
              value={newPassword}
              onChange={value => setNewPassword(value)}
              placeholder={t('enter_password_placeholder')}
            />
          </FormItem>
          <FormItem label={t('confirm_password')}>
            <Input.Password
              value={confirmPassword}
              onChange={value => setConfirmPassword(value)}
              placeholder={t('confirm_password_placeholder')}
            />
          </FormItem>
        </Form>
      </Modal>
    </Form>
  )
}
