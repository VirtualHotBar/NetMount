import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './services/i18n'
import './index.css'
import { App } from './app'
import { BrowserRouter } from 'react-router-dom'
import { init } from './controller/main'
import ReactDOM from 'react-dom/client'
import { Button, Result, Spin } from '@arco-design/web-react'
import './controller/errorHandling'
import { logger } from './services'
import { webviewWindow } from '@tauri-apps/api'
import { exit } from '@tauri-apps/plugin-process'

function StartPage() {
  const { t } = useTranslation()
  const [startStr, setStartStr] = useState('loading')

  useEffect(() => {
    appStart(setStartStr)
  }, [])

  return (
    <div
      style={{
        textAlign: 'center',
        width: '100%',
        height: '100%',
        margin: '0px',
        padding: '0px',
        backgroundColor: 'var(--color-bg-1)',
      }}
      data-tauri-drag-region
    >
      <div style={{ paddingTop: '30%', color: 'var(--color-text-1)' }} data-tauri-drag-region>
        <Spin size={30} />
        <br />
        {t('starting') + ':' + startStr}
      </div>
    </div>
  )
}

const container = document.getElementById('root') as
  | (HTMLElement & {
      __netmount_react_root__?: ReturnType<typeof ReactDOM.createRoot>
    })
  | null
if (!container) {
  throw new Error('Root container #root not found')
}
const reactRoot =
  container.__netmount_react_root__ ??
  (container.__netmount_react_root__ = ReactDOM.createRoot(container))
reactRoot.render(<StartPage></StartPage>)

function ErrorPage({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-1)',
      }}
    >
      <Result
        status="error"
        title={t('error')}
        subTitle={error}
        extra={[
          <Button key="retry" type="primary" onClick={onRetry}>
            {t('retry') || 'Retry'}
          </Button>,
          <Button key="quit" onClick={() => exit(0)}>
            {t('quit') || 'Quit'}
          </Button>,
        ]}
      />
    </div>
  )
}

let appStarting = false
type SetStartStrFn = (str: string) => void
async function appStart(setStartStr: SetStartStrFn) {
  if (appStarting) {
    return
  } //避免重新执行
  appStarting = true

  try {
    await init(setStartStr) //初始化功能
  } catch (e) {
    appStarting = false
    const errorMsg = e instanceof Error ? e.message : String(e)
    logger.error('App init failed', e instanceof Error ? e : new Error(String(e)))

    // 关键修复：初始化失败时也要显示窗口，让用户看到错误信息
    try {
      const appWindow = webviewWindow.getCurrentWebviewWindow()
      await appWindow.show()
      await appWindow.setFocus()
    } catch {
      // ignore show window errors
    }

    reactRoot.render(
      <React.StrictMode>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <ErrorPage
            error={errorMsg}
            onRetry={() => {
              appStarting = false
              reactRoot.render(<StartPage />)
            }}
          />
        </BrowserRouter>
      </React.StrictMode>
    )
    return
  }

  reactRoot.render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <App></App>
      </BrowserRouter>
    </React.StrictMode>
  ) //React.StrictMode:严格模式检查组件副作用
}
