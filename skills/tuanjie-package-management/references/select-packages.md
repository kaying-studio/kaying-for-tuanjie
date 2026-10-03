# Selecting packages

Turn a game concept — genre, look, target platforms, monetization — into a concrete package
list, then install it via the C# PackageManager Client API (see the main `SKILL.md`).

**Principle:** install what the concept actually needs, not everything. A hyper-casual 2D
prototype needs far less than a 3D multiplayer RPG. Prefer packages already provided by the
chosen template (URP templates already include the render pipeline, Input System, etc.) — only
add what's missing. Don't pin exact versions unless a minimum is required; `Client.Add` without
a version resolves the latest compatible release.

The tables below are a starting point, not the whole registry. **Search the registry** to
discover packages beyond this list, confirm an id exists, or check available versions before
installing — see [Discovering and verifying packages](#discovering-and-verifying-packages).

## Discovering and verifying packages

Two ways to search, depending on whether the Editor is involved:

**In-Editor — the PackageManager Client API (preferred).** `Client.SearchAll()` returns every
package available in the project's configured registries (the Tuanjie registry plus any scoped
registries), each with all its versions and metadata — this is what the Package Manager
window's search filters over. `Client.Search("<id>")` inspects a single package. Use the
ready-to-run `PackageSearch` script in the main `SKILL.md` to discover candidates and verify
ids/versions before building the install list.

**Terminal — query the npm-compatible registry directly** (no Editor needed) to confirm a
**known** id exists and list its versions. Tuanjie projects resolve packages from Unity China's
registry:

```bash
# Full metadata for one package: versions{}, dist-tags.latest, description, dependencies.
# -f makes curl fail (non-zero) on HTTP errors — e.g. a 404 for a bad id — instead of piping
# an error page into python; -L follows redirects.
curl -fsSL https://packages.unity.cn/com.unity.cinemachine | python3 -m json.tool | head -40

# Just the latest published version
curl -fsSL https://packages.unity.cn/com.unity.cinemachine \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['dist-tags']['latest'])"
```

Notes:

- The registry supports fetching a **known** package id, but **not** free-text search over HTTP.
  For keyword discovery, use `Client.SearchAll()` in-Editor or the Package Manager window.
- Tuanjie mirrors most `com.unity.*` packages, but **not every international package is
  available** — if a known id 404s or fails to resolve, treat it as missing from the Tuanjie
  registry and look for an alternative (or discuss a scoped registry with the user), rather
  than assuming a typo.
- If a project was migrated from stock Unity and packages fail to resolve, check the registry
  configuration (project or global manifest/registry settings) before blaming package ids.

## Foundation (almost every project)

| Need | Package | Notes |
|---|---|---|
| Modern input | `com.unity.inputsystem` | Preferred over the legacy Input Manager. |
| Text / UI | `com.unity.ugui` | uGUI + TextMeshPro (bundled). UI Toolkit ships with the Editor. |
| Camera framing | `com.unity.cinemachine` | Great for almost any 3D and many 2D games. |
| Testing | `com.unity.test-framework` | Enables `unity test`; usually already present. |
| Large/streamed assets | `com.unity.addressables` | Add when the game has many assets or needs content updates. |

## Render pipeline (pick one; usually set by the template)

| Choice | Package | Use when |
|---|---|---|
| **URP** (Universal) | `com.unity.render-pipelines.universal` | Default for most 2D/3D, mobile, and WebGL. Broadest platform reach. |
| **HDRP** (High-Definition) | `com.unity.render-pipelines.high-definition` | High-fidelity PC/console only. Not for mobile/WebGL. |
| **Built-in** | (none) | Simplest/legacy; fine for tiny prototypes. |

## By dimension & look

| Look | Packages |
|---|---|
| **2D** (any) | `com.unity.2d.feature` (sprites, tilemap, animation, pixel-perfect bundle) |
| **2D pixel-perfect** | `com.unity.2d.pixel-perfect` (included in the 2D feature set) |
| **3D navigation** | `com.unity.ai.navigation` (NavMesh for AI/pathfinding) |
| **Cutscenes / sequencing** | `com.unity.timeline` |
| **No-code logic** | `com.unity.visualscripting` |

## By genre (starting points, combine with the above)

| Genre | Typical additions |
|---|---|
| Platformer / action | URP, Input System, Cinemachine, 2D feature (if 2D), AI Navigation (if 3D) |
| Puzzle / match / card | URP or 2D feature, Input System, uGUI/TextMeshPro, Timeline (juice) |
| Top-down / twin-stick | URP, Input System, Cinemachine, AI Navigation |
| RPG / adventure | URP, Input System, Cinemachine, AI Navigation, Addressables, Timeline |
| Racing / physics | URP, Input System, Cinemachine; Physics is built in |
| Idle / hyper-casual | 2D feature or URP, Input System, uGUI/TextMeshPro (keep it lean) |
| Multiplayer (any) | `com.unity.netcode.gameobjects` — note Unity's global multiplayer *services* (Relay/Lobby/Matchmaker) are shut down for mainland China; plan self-hosted or domestic transport with the user |

## By target platform

Platform support is mostly Editor **modules** (installed via the Tuanjie Hub when downloading
an editor, see the **`tuanjie-cli`** skill), not packages. Package-wise:

| Platform | Consider |
|---|---|
| Mobile (iOS/Android) | Keep dependencies lean; URP over HDRP; Addressables for download size; monetization below |
| WeChat Mini Game / WebGL | Use Tuanjie's WeChat Mini Game solution (微信小游戏解决方案) for 微信小游戏; otherwise URP (not HDRP), small footprint, avoid heavy packages |
| OpenHarmony / automotive | Tuanjie-specific build targets (1.x+); check the installed editor's available modules |
| Desktop / Console | URP or HDRP depending on fidelity target |

## By monetization — install now, integrate with the user

| Goal | Package | Notes |
|---|---|---|
| In-app purchases | `com.unity.purchasing` | Integrate via **implement-in-app-purchases**; on Tuanjie add China channel specifics (WeChat/Douyin mini-game payments, domestic Android stores — no Google Play in mainland) |
| Ads / mediation | — | LevelPlay/IronSource availability in mainland China is limited — verify with the user or plan a domestic ad platform instead |
| Accounts, cloud save, economy, remote config, leaderboards | — | Unity Gaming Services global backend is shut down for mainland China — do not adopt for a mainland Tuanjie project without discussing alternatives |

Install the package(s) here so the manifest is complete, but do the actual wiring only after
confirming with the user how the backend side will be handled.
