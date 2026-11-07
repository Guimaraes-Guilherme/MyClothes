import type { Metadata } from "next";
import { LookView } from "./look-view";

export const metadata: Metadata = { title: "Look" };

export default function LookPage() {
  return <LookView />;
}
