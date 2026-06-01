# Platform Extension Evaluation: Docker & Android

> Evaluated for: NetMount (Tauri 2 + React 18 + Rust)
> Date: 2026-01-15
> Issues: #101 (Docker app?), #106 (Android version?)

---

## Project Architecture Summary

NetMount is a desktop application that wraps two core backend services:

| Component | Role | Language |
|-----------|------|----------|
| **Rclone** | Cloud storage mounting & transfer | Go |
| **OpenList** | File listing & web management | Go |
| **Tauri Shell** | Desktop GUI + process management | Rust |
| **React UI** | User interface | TypeScript |

The Tauri layer manages sidecar processes (Rclone, OpenList), provides platform-specific integrations (WinFsp, Job Objects, autostart), and renders a React-based UI in a native webview.

---

## Issue #101: Docker App

### User Request
> "想在 Docker 容器中运行该应用。可以添加吗？（MergerFS、UnionFS）这样我们就可以在单个连接点查看来自不同云的内容。"

The user wants cloud storage aggregation in Docker, using MergerFS/UnionFS to merge multiple cloud mounts into a single mount point.

### Technical Analysis

#### What NetMount Actually Does in Docker Context

The core value of NetMount (cloud storage management) is delivered by **Rclone** and **OpenList**, not the Tauri GUI. The Tauri layer is a desktop wrapper that:

1. Spawns and manages Rclone/OpenList sidecar processes
2. Provides a native window with React UI
3. Handles platform-specific integrations (WinFsp, Windows Job Objects, registry)

#### Barriers to Full Dockerization

| Barrier | Severity | Detail |
|---------|----------|--------|
| **WebView dependency** | Critical | Tauri requires a display server (X11/Wayland) or native webview. Not available in headless Docker. |
| **FUSE in containers** | High | Mount operations require `--privileged` or `--device /dev/fuse`. Possible but adds security concerns. |
| **Platform-specific Rust code** | Medium | `winapi`, WinFsp, Windows Job Objects are Windows-only. Linux path works but untested in container. |
| **Sidecar process model** | Medium | Tauri spawns child processes and manages their lifecycle. Container orchestration (Docker) has its own process model. |

#### Viable Approaches

**Approach A: Docker Compose with Rclone + OpenList (Recommended)**

Skip the Tauri GUI entirely. Run Rclone and OpenList as standalone containers with MergerFS:

```yaml
services:
  rclone:
    image: rclone/rclone:latest
    volumes:
      - ./config:/config/rclone
      - /mnt/cloud:/mnt/cloud:rshared
    devices:
      - /dev/fuse
    cap_add:
      - SYS_ADMIN
    command: mount remote: /mnt/cloud --vfs-cache-mode full

  openlist:
    image: openlistteam/openlist:latest
    volumes:
      - ./data:/opt/openlist/data
    ports:
      - 5244:5244

  mergerfs:
    image: trapexit/mergerfs
    volumes:
      - /mnt/cloud:/mnt/cloud:ro
      - /mnt/merged:/mnt/merged:rshared
    command: /mnt/cloud/* /mnt/merged -o defaults,allow_other,use_ino,category.create=mfs
```

- **Effort**: Low (configuration only)
- **Practicality**: High — this is what the user actually needs
- **Limitation**: No NetMount GUI, use OpenList web UI instead

**Approach B: Headless Service Mode (Medium-term)**

The codebase already has `--service` flag detection (`fn is_service_mode()` in lib.rs:457). Extending this to run the Rust backend without Tauri's webview could enable a headless Docker mode:

- Expose a REST/WebSocket API from the Rust backend
- Serve the React frontend separately (nginx) or as a web app
- **Effort**: High (significant refactoring of Tauri layer)
- **Practicality**: Medium — requires decoupling GUI from business logic

**Approach C: Docker + VNC/noVNC (Not Recommended)**

Run the full Tauri app in a virtual display:

- Heavy image size (X11 + webview runtime)
- Poor performance over network
- Defeats the purpose of containerization
- **Effort**: Medium
- **Practicality**: Low

### Recommendation for #101

**Short-term**: Provide a `docker-compose.yml` example in the docs that runs Rclone + OpenList + MergerFS as containers. This directly addresses the user's need (cloud aggregation with MergerFS) without modifying NetMount's codebase.

**Medium-term**: If Docker support becomes a priority, invest in decoupling the Rust service layer from Tauri's GUI layer, enabling a headless API server mode. This would also benefit future web-based and mobile clients.

**Response to user**: Explain that NetMount's core components (Rclone, OpenList) can already run in Docker. Provide a docker-compose example. The Tauri GUI itself is a desktop application and not designed for containerization, but the underlying services work well in Docker.

---

## Issue #106: Android Version

### User Request
> "会不会有安卓版啊？"

### Technical Analysis

#### Tauri Android Support Status

Tauri 2.x has **experimental** Android support. The NetMount codebase already shows awareness of this:

```rust
// Cargo.toml line 62 - Updater excluded on mobile
[target."cfg(not(any(target_os = \"android\", target_os = \"ios\")))".dependencies]
tauri-plugin-updater = "2"

// lib.rs line 246 - Conditional plugin loading
#[cfg(not(any(target_os = "android", target_os = "ios")))]
let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
```

This indicates the developers have considered mobile targets.

#### Feasibility Matrix

| Component | Android Feasibility | Notes |
|-----------|-------------------|-------|
| **React UI** | ✅ High | WebView rendering works on Android. UI needs responsive redesign. |
| **Tauri Shell** | ⚠️ Medium | Tauri 2 supports Android experimentally. Plugin compatibility varies. |
| **Rclone** | ⚠️ Medium | Rclone has mobile builds. Can compile for `aarch64-linux-android`. |
| **OpenList** | ⚠️ Medium | Go supports Android cross-compilation. Needs testing. |
| **FUSE Mounting** | ❌ Low | Android doesn't support arbitrary FUSE mounts without root. This is the **critical blocker**. |
| **Process Management** | ⚠️ Medium | Android has strict background process limits. Sidecar model needs adaptation. |
| **File System Access** | ⚠️ Medium | Scoped storage (Android 11+) restricts file access. SAF integration needed. |

#### Critical Blockers

1. **FUSE Mounting on Android**: This is the fundamental blocker. NetMount's primary feature is mounting cloud storage as local filesystems. Android does not allow arbitrary FUSE mounts without root access. Non-root alternatives (Storage Access Framework) exist but provide limited, sandboxed access — not the seamless mount experience users expect.

2. **Platform-specific Rust Code**: The current Rust backend has Windows-specific code (`winapi`, WinFsp, Job Objects). While `#[cfg(target_os = "windows")]` guards exist, Android-specific equivalents would need to be written for process management, filesystem operations, and system integration.

3. **UI Redesign**: The current desktop UI (850x600 min window, custom titlebar, tray icon) would need significant redesign for mobile form factors. The Arco Design component library used (`@arco-design/web-react`) is web-focused and may not provide good mobile UX.

4. **Background Execution**: Android aggressively kills background processes. The sidecar model (long-running Rclone/OpenList processes) would need to use Android Foreground Services, which require notification display and have power management constraints.

#### What Could Work on Android

A **simplified Android client** focused on cloud storage management (not mounting):

- Browse files across cloud storages (via OpenList API)
- Upload/download files
- Transfer between storages
- Configuration management
- View storage space/usage

This would be a **companion app** rather than a full port, connecting to a self-hosted OpenList/Rclone backend.

### Recommendation for #106

**Short-term**: Not feasible. The mounting feature (core value proposition) cannot work on Android without root. The effort required for a full port is very high with uncertain payoff.

**Medium-term**: Consider a **companion Android app** that:
- Connects to a self-hosted NetMount/Rclone backend
- Provides file browsing, upload/download, and management
- Uses OpenList's web API as the backend
- Built with native Android or a mobile framework (Flutter, React Native)

**Long-term**: If Tauri Android support matures and the codebase is refactored to decouple mounting from management, a full Android port becomes more viable.

**Response to user**: Explain that Android support is not currently planned due to Android's FUSE mounting limitations. Suggest using OpenList's web UI on mobile as an alternative, or express interest in a future companion app.

---

## Summary Comparison

| Aspect | Docker (#101) | Android (#106) |
|--------|--------------|----------------|
| **Feasibility** | ✅ High (components already work) | ⚠️ Low (mounting blocker) |
| **Effort** | Low (config/docs) to High (headless mode) | Very High (full port) |
| **User Need** | Cloud aggregation in containers | Mobile cloud management |
| **Recommended Path** | Docker Compose with Rclone/OpenList | Companion app via OpenList API |
| **Timeline** | Short-term (docs) / Medium-term (headless) | Long-term (if ever) |

---

## Actionable Next Steps

### For #101 (Docker)
1. Create a `docker-compose.yml` example for Rclone + OpenList + MergerFS
2. Add Docker deployment documentation to docs site
3. (Optional) Explore headless service mode for future Docker-native support

### For #106 (Android)
1. Close with explanation of technical limitations
2. Suggest OpenList web UI as mobile alternative
3. Track as long-term consideration if Tauri Android matures
