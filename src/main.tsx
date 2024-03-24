import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import './services/i18n'
import './index.css'
import { App } from './app'
import { BrowserRouter } from 'react-router-dom'
import { init } from './controller/main';
import ReactDOM from 'react-dom/client';

function StartPage() {
  const { t } = useTranslation()
  const [startStr, setStartStr] = useState('loading')

  useEffect(() => {
    appStart(setStartStr)
  })

  return <>
    <p>{t('starting') + ':' + startStr}</p>
  </>
}

const reactRoot = ReactDOM.createRoot(document.getElementById('root')!)
reactRoot.render(
  <StartPage></StartPage>
)

let appStarting = false
async function appStart(setStartStr: Function) {
  if (appStarting) { return }//避免重新执行
  appStarting = true
  await init(setStartStr)//初始化功能

  reactRoot.render(<React.StrictMode>
    <BrowserRouter>
      <App></App>
    </BrowserRouter>
  </React.StrictMode>)//React.StrictMode:严格模式检查组件副作用
}