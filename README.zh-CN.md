# kaying-for-tuanjie（团结引擎开发技能）

[English](README.md) | [简体中文](README.zh-CN.md)

面向**团结引擎（Tuanjie Engine，Unity 中国版）**的编码代理技能包。基于 Unity 官方
agent 插件（[Unity-Technologies/unity-agent-plugin](https://github.com/Unity-Technologies/unity-agent-plugin)）
移植，并针对团结引擎完成了工具链改造：Tuanjie 编辑器二进制自动化、
`packages.unity.cn` 包注册表、微信小游戏与国内渠道指引。

当前版本包含 **27 个技能**，覆盖：UI（uGUI / UI Toolkit / IMGUI）、2D 与 Tilemap 全套、
导航、3D 物理、URP 迁移与后处理、Sprite 编辑、Shader Graph 自定义节点、音频优化、
TextMeshPro 优化、本地化、内购（含国内渠道说明）、团结编辑器命令行自动化与包管理。

支持 **Claude Code**、**Codex**、**Pi**、**ZCode** 与 **KayingCode**。

## 安装

**Claude Code** — 以下两条是斜杠命令，请在 Claude Code 会话内输入，而不是终端：

```
/plugin marketplace add kaying-studio/kaying-for-tuanjie
```

```
/plugin install tuanjie@kaying-for-tuanjie
```

也可以改用终端里的 `claude` CLI。这种方式安装的插件在下次启动 Claude Code 时加载，
或在已打开的会话中执行 `/reload-plugins`：

```bash
claude plugin marketplace add kaying-studio/kaying-for-tuanjie
claude plugin install tuanjie@kaying-for-tuanjie
```

**Codex**

```bash
codex plugin marketplace add kaying-studio/kaying-for-tuanjie
```

```bash
codex plugin add tuanjie@kaying-for-tuanjie
```

**Pi** — Pi 会加载在 `package.json` 中声明了 `pi` 清单且带 `pi-package` 关键字的包。
可以从本地检出、npm 或 git 安装：

```bash
pi install /absolute/path/to/kaying-for-tuanjie
# 或：  pi install ./kaying-for-tuanjie           （相对你的项目）
# 或：  pi install npm:kaying-for-tuanjie
# 或：  pi install git:github.com/kaying-studio/kaying-for-tuanjie
```

`install` 默认写入用户级配置（`~/.pi/agent/settings.json`）；加 `-l` 写入项目级配置
（`.pi/settings.json`），方便整个团队共用。只想临时跑一次、不安装：

```bash
pi -e ./kaying-for-tuanjie
```

Pi 版在三处接入插件（见 `extensions/tuanjie.ts` 与 `.pi-plugin/plugin.json`）：

- **`package.json`** — Pi 包清单：`keywords: ["pi-package"]` 用于可发现性，
  `pi.skills` / `pi.extensions` 声明 27 个技能与扩展入口。
- **`extensions/tuanjie.ts`** — Pi 扩展入口：通过 Pi 的 `resources_discover` 事件贡献
  `skills/`，在团结引擎项目内显示页脚状态，并注册 `/tuanjie` 命令
  （`info | skills | docs | doctor`）。
- **`.pi-plugin/`** — Pi 侧清单，与 `.claude-plugin/`（Claude Code）、`.codex-plugin/`
  （Codex）、`.zcode-plugin/`（ZCode）、`.kayingcode-plugin/`（KayingCode）清单保持一致。

**ZCode** — ZCode 的插件清单与市场清单都在本仓库的 `.zcode-plugin/` 目录内
（`plugin.json` 插件清单，`marketplace.json` 本地测试市场清单）。在 ZCode 客户端中：
**插件市场（Discover 页）→ `+` 添加市场**，输入框粘贴 `.zcode-plugin` 目录路径
（如 `D:\code\kaying-office\kaying-for-tuanjie\.zcode-plugin`），或其中 `marketplace.json`
的文件路径，然后在市场中找到 **kaying-for-tuanjie**，点 **安装**。

**KayingCode** — 流程与 ZCode 相同，只是添加市场时改用 `.kayingcode-plugin/` 目录
（或其 `marketplace.json`）。两份清单即 ZCode 清单的 KayingCode 文案版，插件 ID 一致
（`tuanjie@kaying-for-tuanjie-marketplace`）。

> 注意：ZCode/KayingCode 的 `marketplace.json` 里 `source.path` 是指向仓库根目录的本机
> 绝对路径（出于安全考虑不允许用 `..` 引用市场目录之外的位置），仓库移动位置后两个文件
> 都要同步修改。Claude Code、Codex、Pi 的清单使用相对路径，无需改动。

### 验证安装

各代理展示已装插件的方式不同。

**Claude Code** — 输入 `/tuanjie:`，技能会出现在命令列表中；`/plugin` 里也能看到
`tuanjie` 已安装并启用。

**Codex** — 执行 `codex plugin list`：

```
PLUGIN                      STATUS              VERSION
tuanjie@kaying-for-tuanjie  installed, enabled  0.1.0
```

**Pi** — 执行 `pi list` 查看包；会话内输入 `/tuanjie skills` 枚举内置技能，
`/tuanjie doctor` 会报告当前目录是否为团结引擎项目，以及
`ProjectSettings/ProjectVersion.txt` 中的引擎版本。

**ZCode / KayingCode** — 会话中输入 `/` 或查看 **设置 → 技能**，应能看到 `tuanjie:`
前缀的技能（如 `tuanjie:tuanjie-cli`、`tuanjie:tilemap-palette-create`）。插件安装后
默认启用，在团结引擎相关请求上自动触发。

### 手动安装

无法使用市场/安装命令时，可以把检出目录软链到个人技能目录（以 Claude Code 为例，
其他读取普通技能目录的代理同理）：

```bash
git clone https://github.com/kaying-studio/kaying-for-tuanjie.git
ln -s "$(pwd)/kaying-for-tuanjie" ~/.claude/skills/tuanjie
```

**Pi** — 软链到 Pi 的全局技能目录，或把路径加入 `settings.json`：

```bash
ln -s "$(pwd)/kaying-for-tuanjie" ~/.pi/agent/skills/tuanjie
```

```json
{
  "skills": ["/path/to/kaying-for-tuanjie/skills"]
}
```

从下一个会话起，所有项目中都会自动加载。

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
