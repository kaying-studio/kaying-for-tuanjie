# kaying-for-tuanjie (Tuanjie Engine skills)

[English](README.md) | [简体中文](README.zh-CN.md)

Game-development skills for coding agents targeting **Tuanjie Engine (团结引擎, Unity's China
edition)**. Ported from Unity's official agent plugin
([Unity-Technologies/unity-agent-plugin](https://github.com/Unity-Technologies/unity-agent-plugin))
and adapted for Tuanjie: editor-binary automation, the `packages.unity.cn` registry, WeChat Mini
Game awareness, and China-market guidance.

This version ships **27 skills** covering: UI (uGUI / UI Toolkit / IMGUI), the full 2D and
Tilemap set, AI navigation, 3D physics, URP migration and post-processing, sprite editing,
custom Shader Graph nodes, audio optimization, TextMeshPro optimization, localization, IAP (with
China channel notes), Tuanjie editor command-line automation, and package management.

Available for **Claude Code**, **Codex**, **Pi**, **ZCode**, and **KayingCode**.

## Install

**Claude Code** — these two are slash commands, so type them inside a Claude Code session
rather than in a terminal:

```
/plugin marketplace add kaying-studio/kaying-for-tuanjie
```

```
/plugin install tuanjie@kaying-for-tuanjie
```

From a terminal instead, use the `claude` CLI. Installs done this way load the next time you
start Claude Code, or when you run `/reload-plugins` in an open session:

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

**Pi** — Pi loads packages that declare a `pi` manifest in `package.json` plus the
`pi-package` keyword. Install from a local checkout, npm, or git:

```bash
pi install /absolute/path/to/kaying-for-tuanjie
# or:  pi install ./kaying-for-tuanjie           (relative to your project)
# or:  pi install npm:kaying-for-tuanjie
# or:  pi install git:github.com/kaying-studio/kaying-for-tuanjie
```

`install` writes to user settings (`~/.pi/agent/settings.json`); pass `-l` to write to project
settings (`.pi/settings.json`) so the whole team shares it. To try it for a single run without
installing:

```bash
pi -e ./kaying-for-tuanjie
```

The Pi port wires the plugin in three places (see `extensions/tuanjie.ts` and
`.pi-plugin/plugin.json`):

- **`package.json`** — the Pi package manifest: `keywords: ["pi-package"]` for discoverability
  and `pi.skills` / `pi.extensions` declaring the 27 skills and the extension entry point.
- **`extensions/tuanjie.ts`** — the Pi extension entry: contributes `skills/` through Pi's
  `resources_discover` event, sets a footer status inside Tuanjie projects, and registers a
  `/tuanjie` command (`info | skills | docs | doctor`).
- **`.pi-plugin/`** — the Pi-side manifest, mirroring the `.claude-plugin/` (Claude Code),
  `.codex-plugin/` (Codex), `.zcode-plugin/` (ZCode) and `.kayingcode-plugin/` (KayingCode)
  manifests.

**ZCode** — ZCode's plugin manifest and marketplace manifest both live in this repository's
`.zcode-plugin/` directory (`plugin.json` is the plugin manifest, `marketplace.json` is the
local test marketplace manifest). In the ZCode client: **Plugin Marketplace (Discover tab) →
`+` Add Marketplace**, paste the `.zcode-plugin` directory path (e.g.
`D:\code\kaying-office\kaying-for-tuanjie\.zcode-plugin`) or the file path of its
`marketplace.json`, then find **kaying-for-tuanjie** in the market and click **Install**.

**KayingCode** — same flow as ZCode, but add the `.kayingcode-plugin/` directory (or its
`marketplace.json`) as the marketplace. Its two manifests are the ZCode manifests with
KayingCode-facing copy; the plugin ID is identical (`tuanjie@kaying-for-tuanjie-marketplace`).

> Note: `source.path` in the ZCode/KayingCode `marketplace.json` files is an absolute path
> pointing at the repository root (they do not allow `..` references outside the marketplace
> for security reasons), so update both if the repository moves. The Claude Code, Codex and Pi
> manifests use relative paths and need no edit.

### Verify it worked

Each agent surfaces an installed plugin differently.

**Claude Code** — type `/tuanjie:` and the skills appear in the command list. `/plugin` also
shows `tuanjie` as installed and enabled.

**Codex** — run `codex plugin list`:

```
PLUGIN                      STATUS              VERSION
tuanjie@kaying-for-tuanjie  installed, enabled  0.1.0
```

**Pi** — run `pi list` to see the package, then inside a session type `/tuanjie skills` to
enumerate the bundled skills. `/tuanjie doctor` reports whether the current directory is a
Tuanjie project and the engine version from `ProjectSettings/ProjectVersion.txt`.

**ZCode / KayingCode** — open **Settings → Plugin Management** and confirm `tuanjie` shows as
enabled on the Installed tab. In a session, type `/` or check **Settings → Skills**: the
`tuanjie:`-prefixed skills (e.g. `tuanjie:tuanjie-cli`, `tuanjie:tilemap-palette-create`)
should be listed. The plugin is enabled by default and triggers automatically on
Tuanjie-related requests.

### Manual install

If you can't use the marketplace/install commands, link the checkout into your personal skills
directory instead (Claude Code shown; other agents that read a plain skills folder work the
same way):

```bash
git clone https://github.com/kaying-studio/kaying-for-tuanjie.git
ln -s "$(pwd)/kaying-for-tuanjie" ~/.claude/skills/tuanjie
```

**Pi** — link it into Pi's global skills directory, or add the path to `settings.json`:

```bash
ln -s "$(pwd)/kaying-for-tuanjie" ~/.pi/agent/skills/tuanjie
```

```json
{
  "skills": ["/path/to/kaying-for-tuanjie/skills"]
}
```

It loads automatically in every project from your next session onward.

## Usage

Skills trigger automatically on relevant requests in a Tuanjie project. Examples:

- "Migrate a Unity 2022 project to Tuanjie Engine and fix package resolution" →
  `tuanjie-package-management`
- "Add IAP for WeChat Mini Game and the Apple App Store" → `implement-in-app-purchases`
- "Import assets headlessly and generate .meta files" → `tuanjie-cli`

## Relationship to kaying-for-unity

This repository is the Tuanjie branch of
[kaying-for-unity](https://github.com/kaying-studio/kaying-for-unity) (a port of Unity's official
plugin):

- **Reused directly**: 24 engine-API skills (physics, UI, Tilemap, URP, audio, localization, …),
  each carrying a Tuanjie version-mapping note (Tuanjie 2.x ≈ Unity 6 baseline, 1.x ≈ Unity 2022
  LTS).
- **Adapted**: 3 tooling skills — `tuanjie-cli` (Tuanjie.exe batchmode, replacing Unity's
  `unity` CLI), `tuanjie-package-management` (packages.unity.cn registry), `new-tuanjie-project`
  (Tuanjie Hub flow).
- **Not included**: 4 skills depending on Unity's global cloud services (build-live-game,
  setup-multiplayer-services, setup-vivox-voice-chat, levelplay-unity-integration) — those
  services are shut down or restricted in mainland China; domestic alternatives may be added in
  later versions.

## TODO / known limitations

- Unity version anchors inside skills (e.g. `optimize-text-mesh-pro`, `urp-postprocessing`) are
  still phrased as Unity baselines until Tuanjie 2.0's exact Unity base is confirmed.
- Editor install-path discovery in `tuanjie-cli` is generic; defer to the installed Tuanjie Hub.
- Dedicated WeChat Mini Game and OpenHarmony skills are planned for later versions.

## License

Content derives from Unity's official plugin and is distributed under the
[Unity Companion License](LICENSE.md).
