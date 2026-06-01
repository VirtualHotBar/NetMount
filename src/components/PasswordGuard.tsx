/**
 * PasswordGuard - 启动密码保护组件
 * 
 * 当设置了启动密码时，在应用启动时显示密码输入界面
 */

import { useState, useEffect } from 'react'
import { Button, Form, Input } from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { nmConfig } from '../services/ConfigService'

const FormItem = Form.Item

/**
 * 简单的密码哈希函数（与GeneralSettings中一致）
 */
function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

interface PasswordGuardProps {
  children: React.ReactNode
}

export function PasswordGuard({ children }: PasswordGuardProps): JSX.Element {
  const { t } = useTranslation()
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const hasPassword = Boolean(nmConfig.settings.security?.startupPassword)

  useEffect(() => {
    if (hasPassword) {
      setIsLocked(true)
    }
  }, [hasPassword])

  const handleUnlock = () => {
    const hashedInput = hashPassword(password)
    if (hashedInput === nmConfig.settings.security?.startupPassword) {
      setIsLocked(false)
      setError('')
      setPassword('')
    } else {
      setError(t('wrong_password'))
    }
  }

  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--color-bg-1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '20rem',
          padding: '2rem',
          backgroundColor: 'var(--color-bg-2)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {t('enter_startup_password')}
        </h2>
        <Form autoComplete="off">
          <FormItem>
            <Input.Password
              value={password}
              onChange={value => {
                setPassword(value)
                setError('')
              }}
              onPressEnter={handleUnlock}
              placeholder={t('please_input')}
              autoFocus
            />
          </FormItem>
          {error && (
            <div style={{ color: 'var(--color-danger-6)', marginBottom: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <FormItem>
            <Button
              type="primary"
              long
              onClick={handleUnlock}
            >
              {t('unlock')}
            </Button>
          </FormItem>
        </Form>
      </div>
    </div>
  )
}
