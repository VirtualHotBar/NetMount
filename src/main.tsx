import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <h1 className='text-3xl text-center font-bold underline'>124</h1>
<button onClick={performIOTask}>test</button>
  </React.StrictMode>,
)


// 前端 TypeScript 代码片段
import { invoke } from '@tauri-apps/api';


async function performIOTask(): Promise<void> {
  invoke('greet', { name: 'TAURI' })
  // `invoke` returns a Promise
  .then((response) => {
console.log(response);

  })
}
