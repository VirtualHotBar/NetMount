import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import './services/i18n'
import './index.css'
import { App } from './app'
import { BrowserRouter } from 'react-router-dom'
import { init } from './controller/main';
import ReactDOM from 'react-dom/client';
import { Spin } from '@arco-design/web-react';
import './controller/errorHandling'


function StartPage() {
  const { t } = useTranslation()
  const [startStr, setStartStr] = useState('loading')

  useEffect(() => {
    appStart(setStartStr)
  }, [])

  return <div style={{ textAlign: 'center', width: '100%', height: '100%', margin: '0px', padding: '0px', backgroundColor: 'var(--color-bg-1)' }} data-tauri-drag-region>
    <div style={{ paddingTop: '30%', color: 'var(--color-text-1)' }} data-tauri-drag-region>
      <Spin size={30} />
      <br />
      {t('starting') + ':' + startStr}
    </div>
  </div>
}

const container = document.getElementById('root') as (HTMLElement & {
  __netmount_react_root__?: ReturnType<typeof ReactDOM.createRoot>
}) | null
if (!container) {
  throw new Error('Root container #root not found')
}
const reactRoot = container.__netmount_react_root__ ?? (container.__netmount_react_root__ = ReactDOM.createRoot(container))
reactRoot.render(
  <StartPage></StartPage>
)

let appStarting = false
type SetStartStrFn = (str: string) => void;
async function appStart(setStartStr: SetStartStrFn) {
  if (appStarting) { return }//避免重新执行
  appStarting = true

  await init(setStartStr)//初始化功能
  
  reactRoot.render(<React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
    <App></App>
    </BrowserRouter>
  </React.StrictMode>)//React.StrictMode:严格模式检查组件副作用
}
