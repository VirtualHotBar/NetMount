import { ModalHookReturnType } from "@arco-design/web-react"
import { t } from "i18next"

const showLog = (modal: ModalHookReturnType, log: string) => {
  modal.info!({

    title: t('log'),
    content: <div style={{ width: '100%' }}>
      <div style={{ height: '15rem', overflowY: 'auto', textAlign: 'justify', margin: '0 auto' }}>
        <p style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{log}</p>
      </div>
    </div>
  })
}

export { showLog }