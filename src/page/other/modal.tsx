import { ModalHookReturnType } from "@arco-design/web-react"
import { t } from "i18next"

const showLog = (modal:ModalHookReturnType,log: string) => {
    modal.info!({

      title: t('log'),
      content: <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {log}
      </div>
    })
  }

  export{showLog}