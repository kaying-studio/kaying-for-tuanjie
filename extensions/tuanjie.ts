/**
 * Tuanjie Engine (团结引擎) — Pi extension entry point.
 *
 * Pi-native counterpart to this plugin's `.claude-plugin/` (Claude Code),
 * `.codex-plugin/` (Codex), `.zcode-plugin/` (ZCode) and `.kayingcode-plugin/`
 * (KayingCode) manifests. It wires the bundled `skills/` into the Pi agent and
 * exposes a `/tuanjie` command for inspection.
 *
 * Pi is lenient about the Agent Skills spec, so the same 27 `SKILL.md` folders
 * that Claude Code, Codex and ZCode consume are loaded here unchanged. This
 * extension only adds Pi-specific glue (resource discovery, a footer status, a
 * command).
 *
 * Docs: https://pi.dev  ·  Agent Skills spec: https://agentskills.io/specification
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Plugin root — one level up from `extensions/`. */
const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(PLUGIN_ROOT, "skills");
const MANIFEST_PATH = path.join(PLUGIN_ROOT, ".pi-plugin", "plugin.json");

interface PiManifest {
	name?: string;
	displayName?: string;
	version?: string;
	description?: string;
	homepage?: string;
	license?: string;
	skills?: string;
}

function readManifest(): PiManifest {
	try {
		return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as PiManifest;
	} catch {
		return { name: "tuanjie" };
	}
}

/** Parse `name` + `description` from every `skills/<dir>/SKILL.md` frontmatter. */
function listSkills(): Array<{ name: string; description: string }> {
	let dirs: string[] = [];
	try {
		dirs = fs
			.readdirSync(SKILLS_DIR, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
	} catch {
		return [];
	}

	const skills: Array<{ name: string; description: string }> = [];
	for (const dir of dirs) {
		let text: string;
		try {
			text = fs.readFileSync(path.join(SKILLS_DIR, dir, "SKILL.md"), "utf8");
		} catch {
			continue;
		}
		const frontmatter = /^---\s*\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
		const read = (key: string): string => {
			const match = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(frontmatter);
			return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
		};
		skills.push({ name: read("name") || dir, description: read("description") });
	}
	return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** A Tuanjie project has `Assets/` + `ProjectSettings/`, or a `Packages/manifest.json`. */
function isTuanjieProject(cwd: string): boolean {
	const isDir = (relative: string): boolean => {
		try {
			return fs.statSync(path.join(cwd, relative)).isDirectory();
		} catch {
			return false;
		}
	};
	return (isDir("Assets") && isDir("ProjectSettings")) || fs.existsSync(path.join(cwd, "Packages", "manifest.json"));
}

/**
 * Tuanjie has no standalone `unity`-style CLI (automation goes through the
 * editor binary — see the `tuanjie-cli` skill), so "doctor" reports the engine
 * version from `ProjectSettings/ProjectVersion.txt` instead of a PATH lookup.
 */
function readEngineVersion(cwd: string): string | undefined {
	try {
		const text = fs.readFileSync(path.join(cwd, "ProjectSettings", "ProjectVersion.txt"), "utf8");
		const version = /^m_EditorVersion:\s*(\S+)/m.exec(text)?.[1];
		return version;
	} catch {
		return undefined;
	}
}

export default function tuanjieExtension(pi: ExtensionAPI) {
	const manifest = readManifest();
	const displayName = manifest.displayName ?? "Tuanjie";
	const version = manifest.version ?? "unknown";

	// 1. Contribute the bundled skills to Pi's resource discovery so the 27
	//    Tuanjie skills load regardless of the active working directory. This
	//    complements the `pi.skills` entry in package.json (both are additive).
	pi.on("resources_discover", async () => ({ skillPaths: [SKILLS_DIR] }));

	// 2. Surface a footer status when the current project is a Tuanjie project.
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setStatus("tuanjie", isTuanjieProject(ctx.cwd) ? "Tuanjie project" : undefined);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus("tuanjie", undefined);
	});

	// 3. `/tuanjie` command — inspect the plugin from inside a session.
	pi.registerCommand("tuanjie", {
		description: "Tuanjie plugin: info, skills, docs, doctor",
		getArgumentCompletions: (prefix) => {
			const subcommands = ["info", "skills", "docs", "doctor"];
			const filtered = subcommands.filter((sub) => sub.startsWith(prefix));
			return filtered.length > 0 ? filtered.map((sub) => ({ value: sub, label: sub })) : null;
		},
		handler: async (args, ctx) => {
			const sub = (args.trim().split(/\s+/)[0] || "info").toLowerCase();

			if (sub === "skills") {
				const skills = listSkills();
				if (skills.length === 0) {
					ctx.ui.notify("No skills found under " + SKILLS_DIR, "warning");
					return;
				}
				await ctx.ui.select(
					`${displayName} skills (${skills.length})`,
					skills.map((skill) => `${skill.name} — ${skill.description.slice(0, 80)}`),
				);
				return;
			}

			if (sub === "docs") {
				ctx.ui.notify(`${PLUGIN_ROOT}/README.md`, "info");
				return;
			}

			if (sub === "doctor") {
				const projectOk = isTuanjieProject(ctx.cwd);
				const engineVersion = readEngineVersion(ctx.cwd);
				ctx.ui.notify(
					[
						`skills:            ${listSkills().length} found`,
						`Tuanjie cwd:       ${projectOk ? "yes" : "no"}`,
						`engine version:    ${engineVersion ?? "unknown (no ProjectSettings/ProjectVersion.txt)"}`,
					].join("\n"),
					"info",
				);
				return;
			}

			// default: info
			ctx.ui.notify(
				[
					`${displayName} ${version}`,
					manifest.description ?? "",
					`skills: ${SKILLS_DIR}`,
					`docs:   ${PLUGIN_ROOT}/README.md`,
					"subcommands: info | skills | docs | doctor",
				].join("\n"),
				"info",
			);
		},
	});
}
