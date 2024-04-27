import { Result } from '@arco-design/web-react'
import { IconCodeBlock } from '@arco-design/web-react/icon'
import React from 'react'
import { useTranslation } from 'react-i18next'

function DevTips_module() {
  const { t } = useTranslation()
  
    return (
        <Result
        icon={<IconCodeBlock />}
        title={t('dev_tips')}
      ></Result>
    )
}
export { DevTips_module }