# kaying-for-tuanjie（团结引擎开发技能）

[English](README.md) | [简体中文](README.zh-CN.md)

面向**团结引擎（Tuanjie Engine，Unity 中国版）**的编码代理技能包。基于 Unity 官方
agent 插件（[Unity-Technologies/unity-agent-plugin](https://github.com/Unity-Technologies/unity-agent-plugin)）
移植，并针对团结引擎完成了工具链改造：Tuanjie 编辑器二进制自动化、
`packages.unity.cn` 包注册表、微信小游戏与国内渠道指引。

当前版本包含 **27 个技能**，覆盖：UI（uGUI / UI Toolkit / IMGUI）、2D 与 Tilemap 全套、
导航、3D 物理、URP 迁移与后处理、Sprite 编辑、Shader Graph 自定义节点、音频优化、
TextMeshPro 优化、本地化、内购（含国内渠道说明）、团结编辑器命令行自动化与包管理。

## 安装（ZCode）

ZCode 的插件清单与市场清单都在本仓库的 `.zcode-plugin/` 目录内
（`plugin.json` 插件清单，`marketplace.json` 本地测试市场清单）。在 ZCode 客户端中：

1. **插件市场（Discover 页）→ `+` 添加市场**，输入框粘贴 `.zcode-plugin` 目录路径
   （如 `D:\code\kaying-office\kaying-for-tuanjie\.zcode-plugin`），或其中
   `marketplace.json` 的文件路径。
2. 在市场中找到 **kaying-for-tuanjie**，点 **安装**（插件 ID
   `tuanjie@kaying-for-tuanjie-marketplace`，安装后默认启用）。

> 注意：`marketplace.json` 里的 `source.path` 是指向仓库根目录的本机绝对路径
> （ZCode 不允许市场清单用 `..` 引用外部目录），仓库移动位置后需同步修改。

### 验证安装

会话中输入 `/` 或查看 **设置 → 技能**，应能看到 `tuanjie:` 前缀的技能（如
`tuanjie:tuanjie-cli`、`tuanjie:tilemap-palette-create`）。

## 使用方法

在团结引擎项目中提出相关请求时技能会自动触发。例如：

- 「把一个 Unity 2022 项目迁移到团结引擎，处理包管理器报错」→ `tuanjie-package-management`
- 「帮我接入内购，渠道是微信小游戏和苹果商店」→ `implement-in-app-purchases`
- 「用批处理模式导入资源并生成 .meta 文件」→ `tuanjie-cli`

## 与 kaying-for-unity 的关系

本仓库是 [kaying-for-unity](https://github.com/kaying-studio/kaying-for-unity)（Unity 官方插件
移植）的团结引擎分支：

- **直接复用** 24 个引擎 API 级技能（物理、UI、Tilemap、URP、音频、本地化等），
  全部注入了团结版本映射说明（团结 2.x ≈ Unity 6 能力基线，1.x 基于 Unity 2022 LTS）。
- **改造** 3 个工具技能：`tuanjie-cli`（Tuanjie.exe batchmode，替代 Unity 的 `unity` CLI）、
  `tuanjie-package-management`（packages.unity.cn 注册表）、`new-tuanjie-project`（团结 Hub 引导流程）。
- **未收录** 4 个依赖 Unity 全球云服务的技能（build-live-game、setup-multiplayer-services、
  setup-vivox-voice-chat、levelplay-unity-integration）——相关服务已在中国大陆关停或受限，
  国内替代方案将在后续版本补充。

## 待办 / 已知限制

- `optimize-text-mesh-pro`、`urp-postprocessing` 等技能中的 Unity 版本锚点仍以 Unity 基线
  表述，待确认团结 2.0 对应的精确 Unity 版本后再细化。
- `tuanjie-cli` 中团结编辑器的安装路径探测为通用做法，具体默认路径以团结 Hub 实际版本为准。
- 微信小游戏、OpenHarmony 的专项技能计划在后续版本加入。

## 许可

内容源自 Unity 官方插件，遵循 [Unity Companion License](LICENSE.md)。使用条款请以该许可为准。
