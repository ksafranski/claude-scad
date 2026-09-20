# Claude SCAD

A 3D view of the OpenSCAD files Claude Code writes. Spin them, zoom, cut them open, measure
straight off the surface — beside the conversation, updating as you work.

```
/plugin marketplace add ksafranski/claude-scad
/plugin install scad-view@claude-scad
/scad-view
```

That's the whole setup. `/scad-view` finds the most recently edited `.scad` in the project —
or takes a path, as `/scad-view parts/lid.scad` — and opens it in Claude Code's built-in
browser pane. Every `.scad` Claude writes from then on refreshes that pane on its own.

## The program travels in the URL

There is no server side to this, no account, and nothing to click. The plugin gzips the file,
base64s it into the URL's **fragment**, and the page decompresses it on arrival:

| | |
| --- | --- |
| A 2.5 kB gear file | 1.4 kB of URL |
| What the server sees | nothing — a fragment is never sent |
| What you do | nothing |

A fragment is the one part of a URL a browser keeps to itself, so your code never leaves your
machine even though the page is on a CDN. Both routes here are static; there is no backend to
talk to.

Refreshing is a fragment change rather than a page load, so the model swaps **in place** — the
nine megabytes of OpenSCAD WebAssembly stay warm and the camera stays exactly where you left
it.

**STL** saves the same way. The button compiles the program again with OpenSCAD's own
exporter and hands the browser the bytes — no upload, no round trip, and because it works
from the source rather than the mesh on screen, a cut you have open doesn't end up in the
file you print.

## Watching a file instead

If something other than Claude is doing the editing, the viewer can hold a file and rebuild on
every save. Press **How** in the top bar and hand it a `.scad`. That path uses the File System
Access API, so it costs a file dialog, a permission, and a browser that isn't Safari or
Firefox — which is why it isn't the default. One file at a time, read-only, and nothing else
in the project is reachable from the page.

## Running it yourself

```bash
npm install
npm run dev
```

Then point the plugin at it with `/plugin config scad-view@claude-scad` and set the address to
`http://localhost:3000`.

There are no environment variables. Nothing is stored, nothing is uploaded, and there's no
database — the whole app is two static pages and a WebAssembly build of OpenSCAD.

## What's in here

| Path | What it is |
| --- | --- |
| `plugins/scad-view/scripts/view.mjs` | Finds the file, packs it into a URL. Also the hook that refreshes on every write |
| `plugins/scad-view/hooks/hooks.json` | Fires that hook after Write, Edit and MultiEdit |
| `plugins/scad-view/skills/scad-view/SKILL.md` | The `/scad-view` command |
| `src/app/scad-view/page.tsx` | The page, static and server-free |
| `src/lib/scadFragment.ts` | Unpacks the program in the browser, via `DecompressionStream` |
| `src/lib/exportStl.ts` | Compiles to binary STL in a throwaway worker and saves it |
| `src/hooks/useScadSource.ts` | Listens for `hashchange`, so a rebuild never reloads the page |
| `src/hooks/useScadRenderer.ts` | Compiles OpenSCAD in a Web Worker and measures what came out |
| `src/components/ModelViewer.tsx` | The viewer: orbiting, sectioning, and measurement with corner snapping |
| `public/scad/` | The OpenSCAD WebAssembly build, ~9.6 MB, fetched once and cached by the browser |

The viewer is lifted from [Scaid](https://scaid.studio), which is the same renderer with a
design agent attached to it.

## Licence note

OpenSCAD is GPL-2.0. The WebAssembly build in `public/scad/` is shipped unmodified and served
to the browser as a separate file; if you distribute this app publicly, make its corresponding
source available per the GPL.
