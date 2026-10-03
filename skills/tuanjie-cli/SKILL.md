---
name: tuanjie-cli
description: Use when automating the Tuanjie Engine (团结引擎, Unity China edition) from the terminal — headless/batch runs, imports and builds via the Tuanjie editor binary command-line arguments (-batchmode, -executeMethod, -quit, -projectPath, -logFile, -buildTarget), locating the installed Tuanjie editor and Tuanjie Hub, detecting a project's engine version from ProjectSettings/ProjectVersion.txt, reading editor logs, or any Tuanjie editor command-line operation. Also use when the user asks about AI integration with Tuanjie (团结 AI agent, Codely, MCP). For UPM package installs use tuanjie-package-management; for a guided new-project flow use new-tuanjie-project.
allowed-tools:
  - Bash
---

# Tuanjie Engine CLI (团结引擎)

Tuanjie Engine (团结引擎) is Unity's China edition — a fork of Unity maintained by Unity China.
It keeps the Unity editor architecture, project layout, and C# APIs, but it does **not** ship
Unity's standalone `unity` CLI, and the `com.unity.pipeline` live-Editor driving package is not
part of its package offering. Command-line automation therefore goes through the **editor binary
itself** using Unity's standard editor arguments, which Tuanjie inherits.

## Version mapping

Read the actual version from the project — never assume it:

```bash
cat "<project-path>/ProjectSettings/ProjectVersion.txt"
```

| Tuanjie line | Unity baseline | Notes |
|---|---|---|
| Tuanjie 1.x | Unity 2022 LTS | First generation; WeChat Mini Game, OpenHarmony, automotive |
| Tuanjie 2.x | Unity 6 capability baseline | Unity 6 is no longer distributed in mainland China — Tuanjie supersedes it there |

Version strings you may see are Unity-style (e.g. `2022.3.xxfNcN` China builds on the 1.x line,
a 6000.x-style or Tuanjie-numbered version on the 2.x line). Treat the file contents as the
source of truth and the table above as the capability mapping.

## Detect a Tuanjie project

A directory is a Tuanjie (or Unity) project when it has `Assets/` plus
`ProjectSettings/ProjectVersion.txt`. To distinguish Tuanjie from stock Unity:

- The version string in `ProjectVersion.txt` (see mapping above — China `cN` suffixes on the
  1.x line, or a Tuanjie-numbered version).
- The installed editor that opened the project lives under a Tuanjie/Hub install path rather
  than a Unity/Unity Hub path.
- When still unsure, ask the user which engine they use — do not guess.

## Locate the editor binary

There is no registry command to query installed editors. Find the binary by checking, in order:

1. The `m_EditorInstallationPath`-style entries or recent-project records, if the user's Tuanjie
   Hub config is readable (Hub config location varies by version — check the Hub's settings UI).
2. Common install roots: `C:\Program Files\Tuanjie\Hub Editor\<version>` (Windows), or the
   macOS `/Applications/Tuanjie/...` folder — **verify rather than assume**; the Hub lets users
   pick any directory.
3. Ask the user for the install path (or the editor they normally launch).

The executable is `Tuanjie.exe` on Windows (`Editor\Tuanjie.exe` in an install folder); on macOS
look inside `Tuanjie.app/Contents/MacOS/`. If the binary name differs on the installed version,
list the folder to find it.

## Run the editor headless

Standard Unity editor arguments that Tuanjie inherits: `-batchmode`, `-quit`, `-projectPath`,
`-executeMethod`, `-logFile`, `-nographics`, `-buildTarget`, `-createProject`. The same rules as
Unity apply:

- `-executeMethod` takes a `Namespace.Class.Method` static method in an `Editor/` folder script.
- With `-quit` the editor exits as soon as the method returns — fine for **synchronous** work
  (import/save), wrong for **asynchronous** work (UPM requests — see
  `tuanjie-package-management` for the pattern that stays alive).
- `-logFile -` streams the editor log to stdout; `-logFile <path>` writes it to a file. For CI,
  always pass an explicit `-logFile` and check the exit code.

```bash
TUANJIE="<path-to>/Editor/Tuanjie.exe"        # locate as described above
"$TUANJIE" -batchmode -quit -projectPath "<project-path>" \
  -executeMethod ProjectBootstrap.ProjectSaver.SaveAll \
  -logFile - && echo "OK" || echo "Failed: exit $?"
```

Importing new scripts/assets headlessly (to generate `.meta` files) works exactly like Unity:
one batch run that calls `AssetDatabase.Refresh` + `AssetDatabase.SaveAssets`, then
`EditorApplication.Exit(0)`. See the `tuanjie-package-management` skill for ready-to-run scripts
and the async-install pitfall.

## Logs

Prefer `-logFile` on the invocation — it is deterministic and works in CI. The editor also
writes its regular log where Unity's editor does (Windows: `%LOCALAPPDATA%\Unity\Editor\Editor.log`
on the 1.x line; Tuanjie may redirect it on 2.x — trust `-logFile` over guessing). Project-local
crashes and import errors also land under `<project-path>/Logs/`.

## What is NOT available in Tuanjie

- **`unity` CLI** — install/auth/license/releases/projects commands do not exist; there is no
  CLI editor installer. Editors are installed through **Tuanjie Hub** (GUI) or downloaded from
  the Tuanjie/Unity China site.
- **`com.unity.pipeline`** live-Editor driving — not part of Tuanjie's package offering.
- **Unity Version Control (UVCS) integration** — use plain Git with a Unity-style `.gitignore`
  (`Library/`, `Temp/`, `obj/`, `Build/`, `Logs/`).
- **Unity Gaming Services (mainland)** — Relay, Lobby, Matchmaker, Vivox, Friends and related
  global services have been shut down for mainland China. Do not recommend them for Tuanjie
  projects targeting the mainland; discuss self-hosted or domestic alternatives with the user.

## AI integration with Tuanjie

The Tuanjie AI ecosystem is evolving quickly (public betas; features, naming and pricing change):

- **Built-in AI agent (团结引擎 2.0+)** — Tuanjie 2.x ships an AI-native workflow with an agent
  inside the editor ecosystem that can execute development tasks with full project context.
- **Tuanjie AI / Codely (public beta)** — IDE plugins for VS Code, Visual Studio, and JetBrains
  IDEs, connecting the IDE agent to the Tuanjie project context.
- **Community MCP servers** — several open-source MCP implementations expose the Tuanjie editor
  to external coding agents; verify maturity before relying on one.

When the user asks "how do I connect my agent to the Tuanjie editor", present these options with
the caveat that betas change fast, and prefer the batch/`-executeMethod` automation in this skill
as the dependable baseline. Do not invent command names for any of these tools — check what the
user has installed first.
