---
name: sprite-editor
description: Edits Unity sprite properties by generating C# editor scripts using ISpriteEditorDataProvider APIs. Handles sprite rectangles, borders, pivots, outlines, and slicing operations (automatic, grid, isometric). Use when working with sprite assets, sprite sheets, texture atlases, or sprite slicing. Applies to Tuanjie Engine (团结引擎, Unity's China edition).
modes: [agent, ask]
---

> **Tuanjie Engine note (团结引擎)**: adapted from Unity's official agent plugin; applies to Tuanjie Engine (Unity's China edition). Version mapping — Tuanjie 2.x ≈ Unity 6 capabilities, Tuanjie 1.x ≈ Unity 2022 LTS; read `ProjectSettings/ProjectVersion.txt` rather than assuming. Unity's standalone `unity` CLI does not exist in Tuanjie — for command-line automation use the `tuanjie-cli` skill's editor-binary workflow.

# Sprite Editor

Sprite metadata (rects, borders, pivots, outlines) lives inside the importer, not in a file
you can edit — reaching it means running C# against the project headlessly (see `tuanjie-cli`).

On Tuanjie there is no live-Editor `eval` channel: `com.unity.pipeline` is not part of Tuanjie's package offering, and Unity's `unity` CLI does not exist. **The `tuanjie-cli` skill owns getting you there** — locating the installed Tuanjie editor binary and running the project headless; follow it first and don't re-derive any of it here. Every C# step below that the Unity original ran via `unity command eval` runs on Tuanjie with the batch pattern below. If a step's purpose is to *open an editor window* for the user rather than compute a result, hand the user instructions to do it in their open editor instead.

- **Never hand-edit a `.meta` file to change sprite metadata.** The importer owns that data
  and the capability checks below exist to prevent corruption, so an unreachable Editor is a
  stop, not a cue to improvise.

Run each C# snippet headlessly: write it as the body of `public static void Run()` in `Assets/Editor/TuanjieEval/Eval.cs` (namespace `TuanjieEval`), then invoke the editor binary with `-batchmode -projectPath "<project-path>" -executeMethod TuanjieEval.Eval.Run -logFile -` and read the snippet's `Debug.Log` output from the streamed log (see `tuanjie-cli` for locating the binary and logs). Batch several independent steps into one run to amortize project-load time; keep steps that depend on earlier results in one method.

Generates C# editor scripts to manipulate Unity sprites using ISpriteEditorDataProvider. Works with TextureImporter, PSBImporter, and custom importers.

### Passing C# to `eval`

`eval` compiles a **statement block, not a file**. Two consequences, both of which cause a
compile error rather than a warning:

- **No `using` directives.** The compiler reads `using UnityEngine;` as a resource-disposal
  statement and rejects it (`CS0210`).
- **Types must be fully qualified.** A bare `AssetDatabase` or `Volume` does not resolve
  (`CS0246` / `CS0103`), and a bare `Object` is ambiguous with `object` (`CS0104`).

Where a snippet below is written as a file — with usings, for readability, or because it is
meant to be saved into the project — qualify the types before passing it to `eval`.

## Workflow

All generated scripts must follow the Safe Core Pattern in [references/templates.md](references/templates.md), which includes MANDATORY capability checks. NEVER attempt operations if capability checks fail - this prevents data corruption. After execution, verify results in Unity console and Project window.

## Common Operations

**Modify Name/Rect/Border/Pivot:** Update corresponding `SpriteRect` fields (see scripts/SetPivotExample.cs for pivot examples)
- Requires: `EditSpriteName`, `EditSpriteRect`, `EditBorder`, or `EditPivot`

**Add/Remove/Slice:** Create or filter `SpriteRect` array (see [references/background.md](references/background.md) for Unity 2021.2+ requirements)
- Requires: `CreateAndDeleteSprite`

**Set Outlines:** Get `ISpriteOutlineDataProvider` → Call `SetOutlines()` with GUID + Vector2 arrays

## Important Notes

- Do NOT use AssetPostprocessor or MenuItem patterns
- Generate standalone snippets only — no `AssetPostprocessor`, no `MenuItem`
- **Enum assignments:** Always use enum values and cast to numeric types. Never use raw numbers.
  - ✅ Correct: `(int)SpriteAlignment.Center`
  - ❌ Wrong: `1` (magic number)
