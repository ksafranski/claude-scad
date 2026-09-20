import { redirect } from "next/navigation";

/** There's one page here, and this is a site with one job. */
export default function Home() {
  redirect("/scad-view");
}
