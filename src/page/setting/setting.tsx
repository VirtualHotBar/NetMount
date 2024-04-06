import React from 'react'
import { DevTips_module } from '../other/devTips'
import { Button } from '@arco-design/web-react'
import { Test } from '../../controller/test'

export default function Setting_page() {
  return (
    <div>
        <DevTips_module/>
        <Button onClick={Test}>Test</Button>
    </div>
  )
}
