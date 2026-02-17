import { Result } from '@arco-design/web-react'
// import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
interface NoDataProps {
    tips?: string
}

function NoData_module(props:NoDataProps) {
  const { t } = useTranslation()
  
    return (
        <Result
        title={t(props.tips||'no_data')}
      ></Result>
    )
}
export { NoData_module }