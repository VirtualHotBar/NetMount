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
修复前：
1）存储‘管理’页面react.development.js:209  Warning: Each child in a list should have a unique "key" prop.
2）存储‘浏览’页面
react-dom.development.js:86  Warning: validateDOMNesting(...): <div> cannot appear as a descendant of <p>.


1）问题分析：src\page\storage\storage.tsx
在数据映射中，使用的是小写的item.path字段
但Table组件的rowKey属性设置为大写的'Path'
导致React无法找到正确的key字段，从而产生警告
2）问题分析：src\page\storage\explorer.tsx 在<Typography.Paragraph>组件中包含了<div>元素 还有多处

1)方案：将rowKey属性改为小写的'path'以匹配数据字段
2)解决方案：将<Typography.Paragraph>改为普通的<div>元素 等等
---
修复前：‘添加挂载’页面react-dom.development.js:86  Warning: validateDOMNesting(...): <form> cannot appear as a descendant of <form>.

分析：<form> 不能作为另一个 <form> 的后代出现。这是一个嵌套表单的警告，出现在 AddMount_page src/page/mount/add.tsx中，涉及 InputForm_module src/page/other/InputForm.tsx

修复：移除外层 <Form> 标签，将表单项直接放在容器中  移除外层 <Form> 标签，用普通 <div> 容器包装表单项
-----
bug  ’添加挂载‘页面 点击’挂载‘后报错
日志  react.development.js:209  Warning: Each child in a list should have a unique "key" prop.
分析  表格数据映射时缺少唯一 key 属性

修复  
src/page/mount/mount.tsx - 添加了唯一 key 属性
优化了 mountStorage 调用的异步处理添加 async 并使用 loading 状态优化体验
-----
![add。tsx bug](https://github.com/user-attachments/assets/fbd8e94f-7a62-4d2b-bddb-aafc8595b723)
bug1  编辑挂载时候 无法修改挂载路径 没有添加挂载时候的前端选项  挂载路径桌面(推荐)自动分配盘符自定义
bug2  编辑挂载页面 任何修改都无法保存 这个bug在原作2024年1.1.2release就存在
分析：
编辑模式下 mountPath 字段被设置为 hidden={isEditMode}
保存按钮被禁用是因为：
编辑模式下 mountPath 是隐藏字段导致!mountPath 为 true
保存按钮的条件是 disabled={!storageName || !mountPath}，初始状态下 storageName 或 mountPath 为空值

修复：
添加UI编辑挂载时也能看到和修改挂载路径选项（桌面推荐、自动分配盘符、自定义）
if（点‘编辑’）{载入上次保存的路径}
-----
bug if win10环境下，openlist  rclone都是netmount.exe 下的子进程 if win11运行环境 openlist, rclone 是独立进程。if win11下netmount卡死用任务管理器直接关闭进程，会导致openlist rclone 残留，下次启动netmount 会冲突
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
