---
description: Show an OpenSCAD file as a 3D model beside the conversation — spin and zoom it, cut it open along any axis, measure surface to surface, save it as an STL. Use whenever the user asks to see, view, preview, look at, check or inspect a model or a .scad file, whenever they ask how big something is or whether it will print, and whenever you have just written OpenSCAD they haven't seen yet. Takes an optional path; defaults to the most recently edited .scad in the project.
argument-hint: "[path/to/file.scad]"
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/view.mjs" --url "${user_config.host}" $ARGUMENTS`

Open the `URL:` line above in the built-in browser pane, not the user's own browser — this
belongs beside the conversation. Use whichever browser tool this session has for opening a
page in that pane. If there is no such tool, give the user the URL to open themselves.

The program is already inside that link, so the model is on screen as soon as the page is.
There is nothing for the user to click and nothing is uploaded.

From here on, every time you write or edit a `.scad` file in this project you'll be handed a
fresh link. Open it in the same pane straight away, without being asked and without
commenting on it — the page swaps the model in place, keeping the camera where the user left
it. Never paste one of those links into your reply; just open it.

Then say, in one short line, that the model is up — and get back to what you were doing.
