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

依赖框架：![Rclone](https://github.com/rclone/rclone),![OpenList](https://github.com/OpenListTeam/OpenList)。

开发环境:Nodejs(包管理PNPM) + Rust

命令:
- 安装依赖：pnpm install
- 启动开发环境：pnpm tauri-dev
- 构建可执行文件：pnpm tauri-build

## 挂载策略建议（Issue #102）

新增挂载或排查挂载问题时，建议优先按以下策略配置：

- 缓存模式（CacheMode）：
  - `writes`：默认推荐，读写平衡，适合大多数场景。
  - `full`：兼容性更好，但本地缓存占用明显增加。
  - `minimal`：磁盘占用较低，适合轻量浏览和顺序读取。
  - `off`：缓存最少，但随机读取性能和兼容性相对较弱。
- macOS 挂载后端（MountType）：
  - 优先 `nfsmount`（推荐）
  - 其次 `fuse-t`
  - `macfuse` 仅在确有兼容性需求时使用

诊断导出（设置页 -> 导出诊断包）会包含：

- `netmount/config.redacted.json`
- `netmount/mount.snapshot.json`（挂载关键参数快照）
- `logs/*.tail`（组件日志尾部）

## 截图
![image](https://github.com/VirtualHotBar/NetMount/assets/96966978/a919b68e-a165-411f-a99b-d184b3f264b0)

## 鸣谢
- [缤纷云 Bitiful](https://www.bitiful.com/) - 为本项目提供CDN和存储资源。

## 许可证

NetMount的自编代码基于 AGPL-3.0 许可证开源。[详细信息请参阅](https://docs.netmount.cn/license/)
