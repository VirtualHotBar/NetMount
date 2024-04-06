import React, { useEffect, useReducer, useState } from 'react'

import { Button } from "@arco-design/web-react"
import { Test } from "../../controller/test"
import { rcloneInfo } from '../../services/rclone'
import { hooks } from '../../services/hook';

function Home_page() {
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0);//刷新组件
    
    useEffect(() => {

    }, [])

    return (
        <div>

        </div>

    )
}

export { Home_page }