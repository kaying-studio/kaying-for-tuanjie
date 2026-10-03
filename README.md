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

## Install (ZCode)

Both the plugin manifest and the marketplace manifest live in this repository's `.zcode-plugin/`
directory (`plugin.json` plugin manifest, `marketplace.json` local test marketplace manifest).
In the ZCode client:

1. **Plugin Marketplace (Discover tab) → `+` Add Marketplace**, paste the `.zcode-plugin`
   directory path (e.g. `D:\code\kaying-office\kaying-for-tuanjie\.zcode-plugin`), or the file
   path of its `marketplace.json`.
2. Find **kaying-for-tuanjie** in the market and click **Install** (plugin ID
   `tuanjie@kaying-for-tuanjie-marketplace`, enabled by default).

> Note: `source.path` in `marketplace.json` is an absolute path pointing at the repository root
> (ZCode does not allow `..` references outside the marketplace), so update it if the repository
> moves.

### Verify it worked

Type `/` in a session or check **Settings → Skills**: the `tuanjie:`-prefixed skills (e.g.
`tuanjie:tuanjie-cli`, `tuanjie:tilemap-palette-create`) should be listed.

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
