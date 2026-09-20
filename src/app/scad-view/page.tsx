import type { Metadata } from "next";
import { ScadView } from "@/components/ScadView";

export const metadata: Metadata = {
  title: "Claude SCAD",
  description: "See the OpenSCAD file Claude Code is writing, as a 3D model.",
};

/**
 * The viewer, and the whole of this app.
 *
 * A static page, and deliberately so: no database, no API, no account, and nothing for a
 * server to decide. The program arrives in the URL's fragment — the one part of a URL a
 * browser never sends anywhere — so the host serves the same file to everyone and learns
 * nothing about what anybody is building.
 *
 * That's also why nothing is read from `searchParams`: taking a value there would make the
 * page render per request for something the server has no use for.
 */
export default function ScadViewPage() {
  return <ScadView />;
}
