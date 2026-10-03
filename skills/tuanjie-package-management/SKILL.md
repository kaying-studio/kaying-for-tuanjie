---
name: tuanjie-package-management
description: Use when adding, removing, upgrading, or discovering UPM packages in a Tuanjie Engine (团结引擎) project programmatically from outside the Editor — headless or CI package installs via the C# UnityEditor.PackageManager.Client API, verifying package ids/versions against the Tuanjie registry (packages.unity.cn), migrating a Unity project's manifest to Tuanjie, or choosing which packages a game needs by genre, platform, and monetization. Triggers on "install a package", "add com.unity.*", "set up packages headless/CI", "which packages for a [genre] game", or package registry errors after moving to Tuanjie.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Tuanjie Package Management (headless, via the C# Client API)

Add, remove, upgrade, and discover UPM (Unity Package Manager) packages in a Tuanjie Engine
(团结引擎) project programmatically with `UnityEditor.PackageManager.Client`, driven headless
from the terminal or CI. Do **not** hand-edit `Packages/manifest.json` — the Client API resolves
dependencies and compatible versions correctly, whereas manual edits routinely break resolution.

Two Tuanjie specifics to keep in mind:

- **Registry**: Tuanjie resolves packages from Unity China's registry (`packages.unity.cn` /
  `packages-v2.unity.cn`) instead of `packages.unity.com`. `com.unity.*` packages are mirrored
  there, but not every international package is available, and projects migrated from stock
  Unity may need their manifest/registry settings adjusted.
- **No `unity` CLI**: Tuanjie does not ship Unity's standalone CLI, so the editor is invoked as
  a **binary** (see the `tuanjie-cli` skill for locating it); this skill's launcher scripts call
  the editor binary directly.

The Client API itself (`Client.Add`, `Client.SearchAll`, …) is the same Unity API — everything
below works identically in Tuanjie.

## When to use

- Add / remove / upgrade one or more packages in an existing or freshly-created project.
- Set up a project's packages non-interactively in CI.
- Verify a package id exists, or find its available versions, before depending on it.
- Decide which packages a game actually needs — see
  [references/select-packages.md](references/select-packages.md).

## Choosing what to install

Install what the project actually needs, not everything; prefer packages the chosen template
already provides (URP templates already include the render pipeline, Input System, etc.). The
genre / look / platform / monetization → package mapping, plus how to search the registry, is
in [references/select-packages.md](references/select-packages.md). Produce a **deduplicated
list of package ids** and read it back to the user before installing.

## The `-quit` problem — the editor must stay alive

`Client.Add` / `Client.AddAndRemove` are **asynchronous**: they return a `Request` that only
completes on later `EditorApplication.update` ticks (the UPM child process marshals its result
back on the Editor's main-loop pump, so a blocking `while (!req.IsCompleted)` busy-wait
deadlocks it). The Editor must **stay alive** after `-executeMethod` returns, until the request
finishes.

That is why the launcher below never passes `-quit`: with `-quit`, the Editor quits the instant
the method returns — before UPM resolves — so packages never install and the callback never
runs.

**Solution:** launch the **Tuanjie editor binary directly** in `-batchmode` **without** `-quit`:
the Editor stays alive, `EditorApplication.update` keeps ticking, the poll callback runs, and it
calls `EditorApplication.Exit(code)` itself when done — which both quits and sets the process
exit code.

## The installer script

Write this to `Assets/Editor/ProjectBootstrap/PackageInstaller.cs`. It must live under an
`Editor/` folder (or an Editor-only assembly) because it uses `UnityEditor`.

```csharp
using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace ProjectBootstrap
{
    // Installs (and optionally removes) a fixed set of packages via the PackageManager
    // Client API, headless-safe.
    public static class PackageInstaller
    {
        // EDIT this list to match the package selection (see references/select-packages.md).
        static readonly string[] PackagesToAdd =
        {
            "com.unity.inputsystem",
            "com.unity.cinemachine",
            "com.unity.render-pipelines.universal",
            // "com.unity.package@1.2.3"  // pin a version with @ when a minimum is required
        };

        // Optionally drop packages in the same resolution pass (e.g. a template default you don't want).
        static readonly string[] PackagesToRemove = { };

        const double TimeoutSeconds = 600; // UPM resolution + downloads can be slow

        static AddAndRemoveRequest _request;
        static double _deadline;

        // Invoke with: -executeMethod ProjectBootstrap.PackageInstaller.Install  (NO -quit)
        public static void Install()
        {
            if (PackagesToAdd.Length == 0 && PackagesToRemove.Length == 0)
            {
                Debug.Log("[PackageInstaller] Nothing to do.");
                EditorApplication.Exit(0);
                return;
            }

            Debug.Log($"[PackageInstaller] Adding: {string.Join(", ", PackagesToAdd)}");
            _request = Client.AddAndRemove(packagesToAdd: PackagesToAdd, packagesToRemove: PackagesToRemove);
            _deadline = EditorApplication.timeSinceStartup + TimeoutSeconds;
            EditorApplication.update += Poll;
        }

        static void Poll()
        {
            if (_request == null) return;

            if (!_request.IsCompleted)
            {
                if (EditorApplication.timeSinceStartup > _deadline)
                {
                    EditorApplication.update -= Poll;
                    Debug.LogError("[PackageInstaller] Timed out waiting for UPM.");
                    EditorApplication.Exit(2);
                }
                return;
            }

            EditorApplication.update -= Poll;

            if (_request.Status == StatusCode.Success)
            {
                var names = _request.Result.Select(p => $"{p.name}@{p.version}");
                Debug.Log($"[PackageInstaller] Resolved: {string.Join(", ", names)}");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"[PackageInstaller] Failed: {_request.Error?.message}");
                EditorApplication.Exit(1);
            }
        }
    }
}
```

`AddAndRemove` installs the whole set in a single UPM resolution pass — faster and less
error-prone than one `Client.Add` per package.

**Add / remove / upgrade with one script:**
- **Add**: list the id in `PackagesToAdd`.
- **Remove**: list the id in `PackagesToRemove`.
- **Upgrade / pin**: add the id with `@<version>` (e.g. `com.unity.cinemachine@2.9.7`). Without
  a version, resolution picks the latest compatible release.

## Discovering / verifying packages

To confirm an id exists or list its versions before adding it, search the registry. The
in-Editor `Client.SearchAll()` / `Client.Search("<id>")` calls are also async, so they use the
**same poll-and-`Exit` pattern and the same headless run** as the installer. Write
`Assets/Editor/ProjectBootstrap/PackageSearch.cs`:

```csharp
using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace ProjectBootstrap
{
    public static class PackageSearch
    {
        const double TimeoutSeconds = 120;
        static SearchRequest _request;
        static double _deadline;

        // Invoke with: -executeMethod ProjectBootstrap.PackageSearch.SearchAll  (NO -quit)
        public static void SearchAll()
        {
            _request = Client.SearchAll();                 // or Client.Search("com.unity.cinemachine")
            _deadline = EditorApplication.timeSinceStartup + TimeoutSeconds;
            EditorApplication.update += Poll;
        }

        static void Poll()
        {
            if (_request == null) return;
            if (!_request.IsCompleted)
            {
                if (EditorApplication.timeSinceStartup > _deadline)
                {
                    EditorApplication.update -= Poll;
                    Debug.LogError("[PackageSearch] Timed out.");
                    EditorApplication.Exit(2);
                }
                return;
            }
            EditorApplication.update -= Poll;

            if (_request.Status == StatusCode.Success)
            {
                foreach (var p in _request.Result.OrderBy(p => p.name))
                    Debug.Log($"[PackageSearch] {p.name}@{p.versions.latestCompatible}  {p.displayName}");
                Debug.Log($"[PackageSearch] {_request.Result.Length} packages found.");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"[PackageSearch] Failed: {_request.Error?.message}");
                EditorApplication.Exit(1);
            }
        }
    }
}
```

`_request.Result` is a `PackageInfo[]`; each entry exposes `name`, `displayName`, `description`,
and `versions` (`.latest`, `.latestCompatible`, `.all`). For a terminal-only check without the
Editor (a **known** id, not free-text search), query the registry directly — see
[references/select-packages.md](references/select-packages.md#discovering-and-verifying-packages).

## Run it headless (direct editor invocation, no `-quit`)

Locate the Tuanjie editor binary (see the `tuanjie-cli` skill — Hub install path or ask the
user), then run it in batch mode. The script owns quitting via `EditorApplication.Exit`, so do
**not** pass `-quit`:

```bash
TUANJIE="<path-to>/Editor/Tuanjie.exe"   # locate per tuanjie-cli (Windows); macOS: Tuanjie.app/Contents/MacOS/Tuanjie
PROJECT="<project-path>"
METHOD="ProjectBootstrap.PackageInstaller.Install"   # or ...PackageSearch.SearchAll

"$TUANJIE" -batchmode -projectPath "$PROJECT" -executeMethod "$METHOD" -logFile -
echo "Exit code: $?"   # 0 = success, 1 = UPM error, 2 = timeout
```

`-logFile -` streams the Editor log (including the `[PackageInstaller]` / `[PackageSearch]`
lines) to stdout so you can watch resolution progress and read any UPM error.

## Verify

```bash
# Every requested id should appear as a dependency
cat "<project-path>/Packages/manifest.json"
```

Confirm the run exited `0` and each package from the list is present in `manifest.json`. If a
package fails to resolve, `_request.Error.message` is logged; read it and check the id/version
against the registry — note that on Tuanjie the registry is Unity China's (`packages.unity.cn`)
and some international packages are simply unavailable there. The Editor's own log (including
the `[PackageInstaller]` lines) is the stdout you streamed with `-logFile -` above.

## Import & save headlessly (generate `.meta` files)

After a script or tool writes new `.cs`/asset files, the editor must **import** them so it
generates the `.meta` file each asset needs — and every `.cs`/asset MUST be committed together
with its `.meta`. Merely opening the project once in the Tuanjie editor imports and generates
them; use this method when you need it **headless** (in a script or CI).

Unlike the package installer, this is **synchronous** — it finishes before returning — so it is
safe to pass `-quit` here (the method also calls `EditorApplication.Exit` for a clean exit
code). Write `Assets/Editor/ProjectBootstrap/ProjectSaver.cs`:

```csharp
using UnityEditor;
using UnityEngine;

namespace ProjectBootstrap
{
    public static class ProjectSaver
    {
        // Invoke with: -executeMethod ProjectBootstrap.ProjectSaver.SaveAll
        public static void SaveAll()
        {
            AssetDatabase.Refresh(ImportAssetOptions.ForceUpdate);
            AssetDatabase.SaveAssets();
            Debug.Log("[ProjectSaver] Assets imported and saved.");
            EditorApplication.Exit(0);
        }
    }
}
```

```bash
"$TUANJIE" -batchmode -quit -projectPath "$PROJECT" \
  -executeMethod ProjectBootstrap.ProjectSaver.SaveAll -logFile -
```

## Notes

- These editor scripts are a bootstrap convenience. Leave them in
  `Assets/Editor/ProjectBootstrap/` (they do nothing unless invoked) or delete them after
  setup — your call; mention it to the user.
- All scripts live under `Editor/` because they use `UnityEditor`; they never ship in a build.
- The IAP package (`com.unity.purchasing`) installs through this same mechanism — do the actual
  **integration** via the **implement-in-app-purchases** skill. Backend/live-service packages
  (the UGS suite) resolve here too, but their global services are shut down for mainland China;
  discuss alternatives with the user before adopting them in a Tuanjie project.
