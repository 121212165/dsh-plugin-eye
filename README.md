# dsh-plugin-eye

> **dsh 插件家族**：22 个插件同一目录 **[dsh-plugin-family](https://github.com/121212165/dsh-plugin-family)** · 配对 **[dsh-plugin-pc-tuner](https://github.com/121212165/dsh-plugin-pc-tuner)**（电脑体检）。

**EN** — Give the agent a pair of eyes on this PC: `eye_windows` lists visible windows (pid / foreground mark / title via Win32 EnumWindows), `eye_screenshot` grabs the primary screen to `~\.dsh\eye\captures\` (PNG, rotated, max `maxCaptures`) and returns the path so the agent can open it as a local image. Camera capture (`eye_capture`) ships as a **disabled stub** — `allowCamera: false` by default, every call explains itself. Windows-only through `powershell -NoProfile`, zero npm runtime deps.

**中文** —— 「电脑动眼识别」：`eye_windows` 看清单，`eye_screenshot` 看画面；`/eye`、`/eye shot`、`/eye clear`。截图轮转保存，路径不进 git 不进日志摘要；摄像头一期只留接口默认禁用，启用时每次调用都会明示。

## 用法

- **`eye_windows`** —— "前台：..." 结构化窗口清单（前台第一行 ▶）。
- **`eye_screenshot`** —— 全屏 PNG → 返回文件路径，agent 引用后即可"看屏"。
- **`/eye`** —— 清单 + 最新截图路径；**`/eye shot`** 现截一张；**`/eye clear`** 清 captures。

## 配置

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | |
| `dataDir` | `~/.dsh/eye` | 截图目录其下 `captures\` |
| `maxCaptures` | `20` | 轮转保留数 |
| `allowScreen` | `true` | 截屏开关 |
| `allowCamera` | **`false`** | 摄像头一期 stub，开启需显式配置 |
| `order` | `780` | — |

## 红线

- 不在输出中包含截图内容摘要（路径即可），不发网络；摄像头必须显式开启且每次调用提示。
