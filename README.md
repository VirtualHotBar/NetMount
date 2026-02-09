# netmount bug fixes using latest dependencies, long-term maintenance version | netmount 修复bug 使用最新依赖，长期维护版 最新release版
-----
更新日志/what's new：
Before fix:  
<img width="1348" height="648" alt="Please try restarting the program and record the console error information to report to the developer, ErrorTypeErrorFailed" src="https://github.com/user-attachments/assets/79e01121-c818-49db-a997-898ddb344679" />

Key log: Headers: {"Authorization":"openlist-6d97cf79-36e9-4f01-b564-77105acc7d679bC6x49oLrmVKSHwPWNr5IuGjSHlVecqWcRanmbCUCurDmzzvdQZbJ5HTeoF2hk4\n\u001b[36mINFO\u001b[0m[2026-02-0817:25:28]readingconfigfile:...

Analysis: The Authorization header contains the entire command line output, including multi-line text and ANSI color codes! This causes fetch to throw an "Invalid value" error because HTTP headers cannot contain newline characters or control characters.

Conclusion: The issue is in the `getOpenlistToken()` function in openlist.ts, which does not correctly extract the token.

Fixes:  
- Modify the `getOpenlistToken()` function to extract only the first line containing the token.  
- Remove excess logs and control characters.  
- Add error handling.

修复前 :
<img width="1348" height="648" alt="请尝试重启程序，并记录控制台错误信息向开发者反馈,ErrorTypeErrorFailed" src="https://github.com/user-attachments/assets/79e01121-c818-49db-a997-898ddb344679" />

关键日志：Headers: {"Authorization":"openlist-6d97cf79-36e9-4f01-b564-77105acc7d679bC6x49oLrmVKSHwPWNr5IuGjSHlVecqWcRanmbCUCurDmzzvdQZbJ5HTeoF2hk4\n\u001b[36mINFO\u001b[0m[2026-02-0817:25:28]readingconfigfile:...

分析:Authorization header 包含了整个命令行输出，包括多行文本和 ANSI 颜色代码！
这导致 fetch 抛出 "Invalid value" 错误，因为 HTTP header 不能包含换行符或控制字符，

结论：问题在 openlist.ts   getOpenlistToken() 函数，它没有正确提取 token

修复内容：getOpenlistToken() 函数
只提取 token 所在的第一行
移除多余的日志和控制字符
添加错误处理

----------------------------------------------------------

修复前：<img width="1494" height="648" alt="error" src="https://github.com/user-attachments/assets/7c4052cd-07ea-4a51-b200-4d81f3d4f0d1" />
1主要问题Rclone连接失败：前端重复尝试连接但收到 ERR_CONNECTION_REFUSED 错误
2 pnpm tauri dev下偶尔发生netmount/openlist/config.json损坏

分析：
debug 发现 Rclone已经成功启动（日志显示Serving remote control on http://[::]:60021/），但前端连接失败的原因是：
IPv4/IPv6地址不匹配问题：
Rclone绑定到IPv6地址：http://[::]:60021/
前端连接IPv4地址：http://localhost:60021/（Windows默认解析为 127.0.0.1）

时序问题：
Rclone进程启动后需要时间初始化服务，but进程启动后立即测试连接，，而此时服务尚未完全就绪

其他问题：
React DOM嵌套警告 ：<div> 不能作为 <p> 的子元素

已实施的修复
1. 修复React DOM嵌套警告
文件：src/main.tsx 将  < p > 标签改为 < d iv> 标签

2. 修复IPv4/IPv6地址不匹配
文件：src/utils/rclone/process.ts 改为明确的IPv4地址 127.0.0.1

3. 增加服务启动等待时间
文件：src/utils/rclone/process.ts 在spawn后添加1秒等待时间

4. 完善API请求头部
文件：src/utils/rclone/request.ts 问题：只发送Authorization头，缺少Content-Type和请求体 修复：使用完整的headers并添加JSON请求体

5. 增强netmount/openlist/config.json稳定性
文件：src\utils\openlist\openlist.ts  修复modifyOpenlistConfig函数，在文件不存在时使用空对象

修复后：
<img width="1519" height="630" alt="image" src="https://github.com/user-attachments/assets/aeec791e-e240-4f1b-938a-d55283aede08" />

----
修复前：
(匿名) @ react-dom.development.js:25690
add.tsx:55 {label: 'storage.WebDav', type: 'WebDav', description: 'description.webdav', framework: 'openlist', defaultParams: {…}}
add.tsx:75  Warning: Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state.
    at AddStorage_page (http://localhost:5173/src/page/storage/add.tsx:47:17)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:4028:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:4467:5)
    at main
    at Content (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:18020:25)
    at section
    at Layout (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:18081:43)
    at section
    at Layout (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:18081:43)
    at ConfigProvider (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:7478:15)
    at App (http://localhost:5173/src/app.tsx:165:20)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:4410:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:5155:5)
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
warnAboutRenderPhaseUpdatesInDEV @ react-dom.development.js:27540

分析：问题在于 在渲染阶段直接调用 setFieldValue，违反了 React 的渲染纯净性原则

修复内容：src\page\storage\add.tsx 安全地设置 mount_path，避免在渲染阶段更新状态
-----
修复前：
InputForm.tsx:224  Warning: Each child in a list should have a unique "key" prop.

Check the render method of `InputForm_module`. See https://reactjs.org/link/warning-keys for more information.
    at Item5 (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:30363:43)
    at InputForm_module (http://localhost:5173/src/page/other/InputForm.tsx:254:3)
    at div
    at div
    at AddStorage_page (http://localhost:5173/src/page/storage/add.tsx:47:17)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:4028:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:4467:5)
    at main
    at Content (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:18020:25)
    at section
    at Layout (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:18081:43)
    at section
    at Layout (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:18081:43)
    at ConfigProvider (http://localhost:5173/node_modules/.vite/deps/@arco-design_web-react.js?v=24e56973:7478:15)
    at App (http://localhost:5173/src/app.tsx:165:20)
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:4410:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=24e56973:5155:5)
printWarning @ react-jsx-dev-runtime.development.js:87
error @ react-jsx-dev-runtime.development.js:61

分析：问题根源：在 InputForm.tsx 某循环中，渲染多个 <FormItem> 组件时未提供 key 属性

修复方案：
使用 dataItem.name 作为 key：
name 字段是唯一的表单参数标识符

-----
<h1 align="center">
  <br>
<img src="https://raw.githubusercontent.com/VirtualHotBar/NetMount/main/public/img/color.svg" width="150"/>
  <br>
  NetMount
  <br>
</h1>

<h4 align="center">统一管理和挂载云存储设施</h4>

<p align="center">
  <a href="https://www.netmount.cn">首页</a> -
  <a href="https://docs.netmount.cn">文档</a> -
  <a href="https://blog.hotpe.top">博客</a> 
</p>


## 发布版
在仓库的 [Releases](https://github.com/VirtualHotBar/NetMount/releases) 页面或[官方站点](https://www.netmount.cn/download)可以下载到最新发布的版本。

## 开发
招募本项目的维护者，如果你觉得本项目有价值或对你有帮助，请一起完善本项目。

技术栈：Rust + TypeScript + Tauri + React + Vite

开发环境:Nodejs(包管理PNPM) + Rust

命令:
- 安装依赖：pnpm install
- 启动开发环境：pnpm tauri-dev
- 构建可执行文件：pnpm tauri-build

## 截图
![image](https://github.com/VirtualHotBar/NetMount/assets/96966978/a919b68e-a165-411f-a99b-d184b3f264b0)

## 鸣谢
- [缤纷云 Bitiful](https://www.bitiful.com/) - 为本项目提供CDN和存储资源。

## 许可证

NetMount的自编代码基于 AGPL-3.0 许可证开源。[详细信息请参阅](https://docs.netmount.cn/license/)
