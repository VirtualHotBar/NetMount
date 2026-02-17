import { ModalHookReturnType } from "@arco-design/web-react"
import { t } from "i18next"
import { useEffect, useRef } from "react"

const LogContent = ({ log }: { log: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  return (
    <div style={{ width: '100%' }}>
      <div ref={scrollRef} style={{ height: '15rem', overflowY: 'auto', textAlign: 'justify', margin: '0 auto' }}>
        <p style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{log}</p>
      </div>
    </div>
  )
}

const showLog = (modal: ModalHookReturnType, log: string) => {
  modal.info!({
    title: t('log'),
    content: <LogContent log={log} />
  })
}

export { showLog }