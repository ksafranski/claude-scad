#!/usr/bin/env node
/**
 * Puts an OpenSCAD file into a URL the viewer can open.
 *
 * The program travels in the URL's fragment, which is the part a browser never sends to a
 * server. That's what makes the viewer need no permissions, no file dialog and no account:
 * by the time the page loads it already has the code, and the page is still a static file
 * on a CDN that learned nothing.
 *
 * Two jobs, one file. Run plainly, it works out which `.scad` to show and prints the URL —
 * that's `/scad-view`. Run with `--hook`, it does the same after a file is written and hands
 * the URL back to Claude so the open tab can be refreshed.
 *
 * Always exits 0. Its output is injected into a skill or read as a hook result, and a
 * non-zero exit would abort the thing it was trying to help.
 */

import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const isHook = args.includes("--hook");

function flag(name) {
  const at = args.indexOf(`--${name}`);
  return at !== -1 && at + 1 < args.length ? args[at + 1] : null;
}

/**
 * Where Scaid is.
 *
 * The setting arrives as CLAUDE_PLUGIN_OPTION_HOST, which is how Claude Code hands a
 * plugin's userConfig to the processes it starts. It is deliberately NOT passed as an
 * argument: `${user_config.host}` is not substituted in a skill or hook command, and a shell
 * handed that literal fails outright with "bad substitution" — which takes the whole command
 * down with it, silently, before node ever runs.
 *
 * `--url` remains for running this by hand. The `${` check is what stops a stray
 * unsubstituted placeholder from becoming a URL that cannot exist.
 */
function host() {
  const given = flag("url");
  const value =
    (given && !given.includes("${") ? given : null) ||
    process.env.CLAUDE_PLUGIN_OPTION_HOST ||
    process.env.SCAID_VIEW_URL ||
    "https://claude-scad.vercel.app";
  return value.replace(/\/+$/, "");
}

/**
 * Which projects have already been told about the viewer.
 *
 * Only ever used to decide between the full introduction and a bare link — the hook speaks
 * up for every `.scad` either way. Losing this file costs one repeated explanation, which is
 * why nothing here tries very hard to keep it.
 */
function openFile() {
  const dir = process.env.CLAUDE_PLUGIN_DATA || join(homedir(), ".scaid");
  return join(dir, "open.json");
}

function readOpen() {
  try {
    return JSON.parse(readFileSync(openFile(), "utf8"));
  } catch {
    return {};
  }
}

function markOpen(projectDir) {
  const open = readOpen();
  open[projectDir] = Date.now();
  try {
    mkdirSync(dirname(openFile()), { recursive: true });
    writeFileSync(openFile(), `${JSON.stringify(open, null, 2)}\n`);
  } catch {
    // Without the marker the hook simply stays quiet, which is the safe direction.
  }
}

/** Directories never worth walking into — huge, and nobody designs in them. */
const SKIPPED = new Set([
  "node_modules", "dist", "build", "out", "target", "vendor", "coverage", "__pycache__", "venv",
]);
const MAX_DEPTH = 8;

/** The most recently modified `.scad` under a directory, or null if there isn't one. */
async function newestScad(root) {
  let best = null;

  async function walk(dir, depth) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !SKIPPED.has(entry.name)) await walk(full, depth + 1);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith(".scad")) continue;

      try {
        const info = await stat(full);
        // Ties break on path, so a folder written in one go still picks deterministically.
        if (!best || info.mtimeMs > best.mtimeMs || (info.mtimeMs === best.mtimeMs && full < best.path)) {
          best = { path: full, mtimeMs: info.mtimeMs };
        }
      } catch {
        // Vanished between being listed and being measured.
      }
    }
  }

  await walk(root, 0);
  return best?.path ?? null;
}

const b64url = (buffer) => buffer.toString("base64url");

function viewUrl(at, file, code) {
  const packed = b64url(gzipSync(Buffer.from(code, "utf8"), { level: 9 }));
  const where = b64url(Buffer.from(file, "utf8"));
  return `${at}/scad-view#c=${packed}&f=${where}`;
}

/**
 * Past this, the URL costs more to carry through a conversation than it's worth.
 *
 * Only very large programs get here — a typical part compresses to a kilobyte or two — and
 * the answer is to say what happened rather than to paste twenty thousand characters.
 */
const MAX_URL = 8_000;

function readCode(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */

if (isHook) {
  const payload = await new Promise((done) => {
    if (process.stdin.isTTY) return done(null);
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      try {
        done(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        done(null);
      }
    });
    process.stdin.on("error", () => done(null));
  });

  const named = payload?.tool_input?.file_path;
  const projectDir = payload?.cwd || process.cwd();

  // Two reasons to stay silent, both common: it wasn't a .scad, or the file went away again.
  if (typeof named === "string") {
    const file = resolve(projectDir, named);
    if (file.toLowerCase().endsWith(".scad")) {
      const code = readCode(file);
      if (code) {
        const url = viewUrl(host(), file, code);
        const introduced = Boolean(readOpen()[projectDir]);

        /**
         * The first OpenSCAD file in a project gets the whole story; everything after it
         * gets a link.
         *
         * Nobody should have to know this plugin exists before it does anything. The old
         * behaviour waited for /scad-view to be typed, which meant the one person who most
         * needed telling — someone who had just written their first .scad and had no idea a
         * viewer was available — was the one person it stayed quiet for.
         */
        const context =
          url.length > MAX_URL
            ? `${basename(file)} changed, and it's too large to put in a link here. ` +
              `Run /scad-view to refresh the live view.`
            : introduced
              ? `${basename(file)} changed. Open this in the built-in browser pane to refresh ` +
                `the live view — it swaps in place, without reloading:\n${url}`
              : `This project has OpenSCAD in it, and there's a 3D viewer for it. Open this ` +
                `link in the built-in browser pane now, and say in one short line that they ` +
                `can see the model there — that it can be spun and zoomed, cut open along any ` +
                `axis, measured surface to surface, and saved as an STL. Nothing is uploaded; ` +
                `the program travels inside the link. From here on you'll get a fresh link ` +
                `after every .scad you write, and you should open each one without being ` +
                `asked and without remarking on it.\n${url}`;

        if (!introduced) markOpen(projectDir);

        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context },
          }),
        );
      }
    }
  }
  process.exit(0);
}

const at = host();
const named = args.find((value, index) => !value.startsWith("--") && args[index - 1] !== "--url");
const file = named ? resolve(process.cwd(), named) : await newestScad(process.cwd());

if (!file) {
  console.log("No .scad file found in this project yet.");
  console.log("Write one and run /scad-view again, or name one: /scad-view path/to/part.scad");
  process.exit(0);
}

const code = readCode(file);
if (!code) {
  console.log(`Couldn't read ${file}.`);
  process.exit(0);
}

/**
 * Is the viewer actually there?
 *
 * Worth the round trip on this path, because the failure it catches is silent otherwise: a
 * mistyped address still produces a perfectly well-formed link, and the first sign anything
 * is wrong would be a page that won't load, with nothing to say why. Only the slash command
 * pays for this — the hook fires on every file save and can't afford it.
 */
let up = false;
try {
  const response = await fetch(`${at}/scad-view`, {
    method: "HEAD",
    signal: AbortSignal.timeout(4_000),
  });
  up = response.ok;
} catch {
  up = false;
}

if (!up) {
  console.log(`The viewer isn't answering at ${at}.`);
  console.log("Start it, or change the address with: /plugin config scad-view@claude-scad");
  process.exit(0);
}

markOpen(process.cwd());

const url = viewUrl(at, file, code);
console.log(`FILE: ${file}`);
console.log(url.length > MAX_URL ? "URL: (too large to link — open the viewer and watch the file instead)" : `URL: ${url}`);
console.log(`${basename(file)} is in that link already — there's nothing to click and nothing uploaded.`);
