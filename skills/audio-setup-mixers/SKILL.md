---
name: audio-setup-mixers
description: Scans the scene and audio assets to appropriately route Audio Sources into existing Audio Mixer Groups, classifying each source by what it plays. Use when the user asks about cleaning up mixer assignments, routing audio through a mixer, or which group a sound belongs in. Creating mixers and groups, and setting volumes, are not automated — the skill inventories what exists and asks the user to add anything missing. Applies to Tuanjie Engine (团结引擎, Unity's China edition).
---

> **Tuanjie Engine note (团结引擎)**: adapted from Unity's official agent plugin; applies to Tuanjie Engine (Unity's China edition). Version mapping — Tuanjie 2.x ≈ Unity 6 capabilities, Tuanjie 1.x ≈ Unity 2022 LTS; read `ProjectSettings/ProjectVersion.txt` rather than assuming. Unity's standalone `unity` CLI does not exist in Tuanjie — for command-line automation use the `tuanjie-cli` skill's editor-binary workflow.
# Audio Mixer Setup

Routing an Audio Source to a mixer group is a scene edit that only a running Editor can
make, so this skill needs to execute C# against the project — headless batch runs work (see Step 0)
before anything else.

**What this skill automates, and what it hands back to you.** Inspecting mixers and
routing Audio Sources into groups is entirely public Unity API, and that is the tedious
part — walking dozens of sources and classifying them by what they play. Creating a mixer
or a group has no public API; it exists only on types Unity does not commit to keeping
stable. So this skill will not create groups behind your back. It inventories what exists,
proposes the routing, asks you to add any missing group in the Audio Mixer window, and
then does all the routing itself.

That is a deliberate limit, not a gap to work around. Do not reach for reflection to
create groups, and do not hand-edit a `.mixer` file — mixer structure is not safely
authorable blind.

## Step 0: Confirm you can run C# in the Editor

On Tuanjie there is no live-Editor `eval` channel: `com.unity.pipeline` is not part of Tuanjie's package offering, and Unity's `unity` CLI does not exist. **The `tuanjie-cli` skill owns getting you there** — locating the installed Tuanjie editor binary and running the project headless; follow it first and don't re-derive any of it here. Every C# step below that the Unity original ran via `unity command eval` runs on Tuanjie with the batch pattern below. If a step's purpose is to *open an editor window* for the user rather than compute a result, hand the user instructions to do it in their open editor instead.

- **Do not fall back to editing `.mixer` files by hand.** Mixer routing is not safely
  authorable blind, so an unreachable Editor is a stop, not a cue to improvise.

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

## Step 1: Pre-flight
If the user hasn't explicitly asked for Audio Mixers, confirm that they want to proceed with setting them up.

Then inventory what already exists with the mixer-inventory snippet in
[references/api.md](references/api.md), run through the Editor as described in Step 0. That gives
you every mixer in the project and the group names in each.

It returns a flat list of groups, not the parent/child tree. That is enough to route into, and it
is all the public API exposes. If the hierarchy matters for the conversation, ask the user to look
at the Audio Mixer window and describe it — don't reach for the non-public tree API to find out.

**If the project has no mixer at all,** say so and stop rather than improvising one: creating a
mixer has no public API. Ask the user to create one (Window → Audio → Audio Mixer, then the **+**
next to Mixers), and pick up from here once it exists.

## Step 2: Find scene references
Find all Audio Source components, look at their assigned Generator asset names, and generalize a fitting class or category of the sound name, ideally something already existing. 
Examples for Audio Clip asset names:
- "FootStep4_Sound" -> Foley
- "Dialogue_Female_Scene4" -> Vox/Voice/Dialogue
- "GunShot" -> SFX
- "Menu_Theme_Variation" -> Music

If the assigned asset isn't descriptive or non-existing, try to look at the GameObject name or potential adjacent MonoBehaviour names.
Ask to create an Uncategorized group if it seems hard or confidence is low in classifying how an Audio Source is being used.

## Step 3: Agree the group list, and get any missing groups created
Present the classification from Step 2 as a proposed routing — each Audio Source and the group you
intend to send it to — and revise it with the user.

**WAIT for the user to respond before proceeding.**

Prefer an existing group when it genuinely covers the category, even if you'd have named it
differently. But **don't collapse categories that a mixing engineer would keep apart** — Foley is a
subset of SFX, not another word for it, so a gunshot does not belong in a `Foley` group just because
one exists. When the existing groups only partly cover your categories, say which ones fit and which
need a new group, and let the user decide.

For categories with no matching group, you cannot create the group — there is no public API for it.
Hand it over precisely, naming the mixer and the exact group names, as shown at the end of
[references/api.md](references/api.md). Then **re-run the inventory snippet to confirm the groups
exist and check their spelling** before routing. Don't assume the user did it, and don't assume
they spelled it the way you asked.

## Step 4: Route the Audio Sources
With the group list settled and confirmed present, assign each Audio Source's output group using the
routing snippet in [references/api.md](references/api.md). It is public API throughout, and it wraps
the whole pass in a single undo step so the user can back all of it out at once.

**Key the mapping on the identifier you classified by.** Step 2 reads the clip asset name first and
only falls back to the GameObject name, so the mapping accepts either — the two are different
identifiers and keying on the wrong one drops sources.

Three things to report rather than assume:

- **Any `NO SUCH GROUP` entries the snippet returns.** That means a group you expected is not in the
  mixer — usually a spelling difference. Resolve it with the user, don't silently skip the source.
- **Any `NOT IN THE MAPPING` entries.** Those are Audio Sources your classification missed. Reporting
  a successful routing while sources were quietly left unrouted is the worst outcome here, because it
  reads as success.
- **The scene was modified, not the mixer asset.** Routing lives on the Audio Source, so it only
  persists once the scene is saved. Tell the user, and save only with their agreement.

**Volume, effects, and re-parenting are out of scope.** Those live on non-public API. If the user
asks for them, say the routing is done and point them at the Audio Mixer window for the mix itself.

## References
See [references/api.md](references/api.md)