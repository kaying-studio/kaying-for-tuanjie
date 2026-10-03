---
name: urp-postprocessing
description: Sets up, configures, and debugs URP post-processing effects using the Volume framework. Use when the user asks about bloom, tonemapping, color adjustments, depth of field, vignette, motion blur, or other Volume overrides in a URP project. Applies to Tuanjie Engine (团结引擎, Unity's China edition).
required_packages:
  com.unity.render-pipelines.universal: ">=14.0.0"
---

> **Tuanjie Engine note (团结引擎)**: adapted from Unity's official agent plugin; applies to Tuanjie Engine (Unity's China edition). Version mapping — Tuanjie 2.x ≈ Unity 6 capabilities, Tuanjie 1.x ≈ Unity 2022 LTS; read `ProjectSettings/ProjectVersion.txt` rather than assuming. Unity's standalone `unity` CLI does not exist in Tuanjie — for command-line automation use the `tuanjie-cli` skill's editor-binary workflow.

Help the user set up, configure, and debug post-processing effects using URP's Volume framework.

**Goal: The user should have a working visual result with zero console errors after setup.**

## 0. Prerequisite: an Editor you can run C# in

Volume profiles, `VolumeParameter.overrideState`, and the camera's post-processing flags are
Editor/runtime object state — the checks and edits below all run C# against the project, headlessly in batch mode.

On Tuanjie there is no live-Editor `eval` channel: `com.unity.pipeline` is not part of Tuanjie's package offering, and Unity's `unity` CLI does not exist. **The `tuanjie-cli` skill owns getting you there** — locating the installed Tuanjie editor binary and running the project headless; follow it first and don't re-derive any of it here. Every C# step below that the Unity original ran via `unity command eval` runs on Tuanjie with the batch pattern below. If a step's purpose is to *open an editor window* for the user rather than compute a result, hand the user instructions to do it in their open editor instead.

Run each C# snippet headlessly: write it as the body of `public static void Run()` in `Assets/Editor/TuanjieEval/Eval.cs` (namespace `TuanjieEval`), then invoke the editor binary with `-batchmode -projectPath "<project-path>" -executeMethod TuanjieEval.Eval.Run -logFile -` and read the snippet's `Debug.Log` output from the streamed log (see `tuanjie-cli` for locating the binary and logs). Batch several independent steps into one run to amortize project-load time; keep steps that depend on earlier results in one method.

### Passing C# to `eval`

`eval` compiles a **statement block, not a file**. Two consequences, both of which cause a
compile error rather than a warning:

- **No `using` directives.** The compiler reads `using UnityEngine;` as a resource-disposal
  statement and rejects it (`CS0210`).
- **Types must be fully qualified.** A bare `AssetDatabase` or `Volume` does not resolve
  (`CS0246` / `CS0103`), and a bare `Object` is ambiguous with `object` (`CS0104`).

Where a snippet below is written as a file — with usings, for readability, or because it is
meant to be saved into the project — qualify the types before passing it to `eval`.

## 0. Pre-Flight Checks

Before configuring any effect, **verify all checks**. Fix failures first.

1. **URP is the active render pipeline** — If not, inform the user and stop.
2. **HDR is enabled on the URP Asset** — Required for Tonemapping. Bloom works best with HDR; in SDR it still works but `threshold` must be < 1.
3. **Camera has post-processing enabled** — `renderPostProcessing` must be `true` (defaults to `false`). Camera Stacking: only a `CameraRenderType.Base` camera (or the last `Overlay` in the stack) should enable post-processing. Also verify the Renderer's PostProcessData asset is not null — if it is, the post-process pass won't exist.
4. **The Volume's GameObject layer is in the Camera's Volume Layer Mask** — `volumeLayerMask` defaults to layer 0 "Default" only. The Volume's `GameObject.layer` must be included, otherwise the camera ignores it.
5. **Volume exists with `enabled = true`, a valid Profile, and at least one override** — The `Volume` component must be enabled, have a non-null `profile` (or `sharedProfile`), and at least one `VolumeComponent` with `overrideState = true` on its properties.

### Pre-Flight Check Snippet

Run this to verify the setup programmatically:

```csharp
// `eval` compiles a statement block, not a file: no `using` directives are
// allowed, so every type is fully qualified.
var report = new System.Text.StringBuilder();

// 1. Check URP is active — a hard stop, so throw: it fails the eval loudly
var urpAsset = UnityEngine.Rendering.Universal.UniversalRenderPipeline.asset;
if (urpAsset == null)
    throw new System.Exception("URP is not the active render pipeline.");

// 2. Check HDR
if (!urpAsset.supportsHDR)
    report.AppendLine("Warning: HDR is disabled on the URP Asset. Tonemapping won't work; Bloom requires threshold < 1.");

// 3. Check camera post-processing
var cam = UnityEngine.Camera.main;
if (cam == null)
    throw new System.Exception("No Main Camera found.");
if (!cam.TryGetComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>(out var camData))
    throw new System.Exception("Missing UniversalAdditionalCameraData on camera. Is URP active?");
if (!camData.renderPostProcessing)
    report.AppendLine("Warning: Post-processing is disabled on the camera. Enable via camData.renderPostProcessing = true.");

// 4. Check volume layer mask
var volumes = UnityEngine.Object.FindObjectsByType<UnityEngine.Rendering.Volume>(UnityEngine.FindObjectsSortMode.None);
foreach (var vol in volumes)
{
    if (!vol.enabled) { report.AppendLine($"Warning: Volume '{vol.name}' is disabled."); continue; }
    if ((camData.volumeLayerMask & (1 << vol.gameObject.layer)) == 0)
        report.AppendLine($"Warning: Volume '{vol.name}' on layer {vol.gameObject.layer} is not in camera's volumeLayerMask.");
    // 5. Check profile and overrides
    var profile = vol.sharedProfile;
    if (profile == null) { report.AppendLine($"Warning: Volume '{vol.name}' has no profile assigned."); continue; }
    if (profile.components.Count == 0)
        report.AppendLine($"Warning: Volume '{vol.name}' profile has no overrides.");
}

// Return the findings: logs land in the Editor console, the returned value comes back to you
return report.Length == 0 ? "Post-processing setup looks correct." : report.ToString();
```

## 1. Volume Setup

Effects are added as **VolumeComponent overrides** on a **VolumeProfile** (a `ScriptableObject`).

**Global Volume** (most common): GameObject with `Volume` component, `isGlobal = true`, `profile` assigned. Affects every camera whose `volumeLayerMask` includes the Volume's layer.

**Local Volume (optional, but takes precedence)**: GameObject with trigger `Collider` + `Volume` component, `isGlobal = false`. Properties:
- `priority` (float) — higher values override lower when volumes overlap.
- `blendDistance` (float) — outer distance in world units to start blending from (0 = no blend, instant transition at collider boundary).
- `weight` (float, 0–1) — scales the volume's overall influence.

## 2. Post-Processing Effects

All effects are `VolumeComponent` subclasses added as overrides on a `VolumeProfile` via `profile.Add<T>()`. Check existence with `profile.Has<T>()` or `profile.TryGet<T>(out var t)`. Remove with `profile.Remove<T>()`.

Every property is a `VolumeParameter`. You **must** set `overrideState = true` before setting `value`, otherwise the Volume system ignores it.

When configuring a specific effect, load the full API reference:
- [references/effect-reference.md](references/effect-reference.md) — All VolumeComponent properties by effect (Bloom, Tonemapping, ColorAdjustments, DepthOfField, Vignette, MotionBlur, FilmGrain, ChromaticAberration, SplitToning, LensDistortion, WhiteBalance, PaniniProjection, LiftGammaGain, ShadowsMidtonesHighlights, ColorCurves, ChannelMixer)

For code templates:
- [references/code-templates.md](references/code-templates.md) — Global Volume setup, camera post-processing, and profile modification templates

## 3. Anti-Hallucination Rules

### Required Usings

These apply when you write a `.cs` file into the project. **A snippet passed to `eval` cannot
carry them** — qualify the types instead (see "Passing C# to `eval`" above).

```csharp
using UnityEngine.Rendering;           // Volume, VolumeProfile, VolumeComponent, VolumeParameter
using UnityEngine.Rendering.Universal;  // Bloom, Tonemapping, ColorAdjustments, UniversalRenderPipeline, etc.
```

### Wrong → Correct API Mapping

| WRONG | CORRECT |
|-------|---------|
| `PostProcessVolume` | `Volume` (from `UnityEngine.Rendering`) |
| `PostProcessLayer` | `UniversalAdditionalCameraData.renderPostProcessing` (bool) |
| `UnityEngine.Rendering.PostProcessing` | `UnityEngine.Rendering.Universal` |
| `profile.GetSetting<T>()` | `profile.TryGet<T>(out var t)` (returns bool) |
| `profile.AddSettings<T>()` | `profile.Add<T>()` (returns T; throws if already exists — check `profile.Has<T>()` first) |
| `volume.sharedProfile` (to modify at runtime) | `volume.profile` (auto-clones the asset into an instance) |
| `VolumeManager.instance.stack.GetComponent<T>()` | `volume.profile.TryGet<T>(out var t)` |

### Key Facts
- **`overrideState = true`** is required on every `VolumeParameter` you set. The volume system skips parameters where `overrideState` is `false`. This is the #1 scripting mistake.
- **`sharedProfile`** = returns the asset directly (edits persist to disk). **`profile`** = auto-clones into an instance if needed (safe for runtime edits). Check with `volume.HasInstantiatedProfile()`.
- **`profile.Add<T>(bool overrides = false)`** — pass `true` to auto-enable `overrideState` on all parameters of the added component.

## 4. Debugging Checklist

When post-processing isn't working, check in order:

1. `cam.TryGetComponent<UniversalAdditionalCameraData>(out var data)` succeeds and `data.renderPostProcessing` is `true`?
2. Volume exists in scene with a non-null `profile` (or `sharedProfile`) assigned?
3. Overrides added via `profile.Add<T>()` AND `overrideState = true` on each property you set?
4. Volume's `GameObject.layer` is included in camera's `data.volumeLayerMask`? (Default mask is layer 0 "Default" only.)
5. `volume.isGlobal = true` (for global), or camera is inside the Volume's trigger `Collider` (for local)?
6. Camera `data.renderType` is `CameraRenderType.Base`, not `Overlay`? (Overlay cameras composite onto the Base camera's output.)
7. `UniversalRenderPipeline.asset.supportsHDR` is `true`? Required for Bloom and Tonemapping.
8. Viewing in **Game view**? Scene view has a separate post-processing toggle in its toolbar.

## 5. Common Recipes

Format: Effect property=value. Bloom values are threshold/intensity/scatter.

**Cinematic (Film):** Tonemapping mode=ACES, ColorAdjustments contrast=15 saturation=-10, Bloom threshold=0.9 intensity=0.5 scatter=0.7, Vignette intensity=0.3 smoothness=0.4, FilmGrain type=Medium1 intensity=0.2

**Stylized/Vibrant:** Tonemapping mode=Neutral, ColorAdjustments saturation=20 contrast=10, Bloom threshold=0.8 intensity=1.5 scatter=0.6, SplitToning highlights=warm shadows=cool

**Horror/Dark:** ColorAdjustments postExposure=-0.5 saturation=-30 contrast=20, Vignette intensity=0.5 smoothness=0.3 color=dark-red, FilmGrain type=Large01 intensity=0.4, ChromaticAberration intensity=0.15

**Clean/Mobile:** Tonemapping mode=Neutral, ColorAdjustments postExposure=0.2, Bloom threshold=1.0 intensity=0.3 (subtle). Avoid FilmGrain, MotionBlur, DepthOfField on mobile.

## 6. Final Confirmation

After setup, report to user:

```
Post-Processing Setup Complete
- Volume: [Global/Local] on "[GameObject Name]"
- Profile: [Asset Path]
- Effects: [List with key property=value pairs]
- Camera: [Name] — renderPostProcessing=true, volumeLayerMask includes layer [N]

View results in Game view (not Scene view).
Undo all changes with Edit > Undo (Ctrl+Z).
```
