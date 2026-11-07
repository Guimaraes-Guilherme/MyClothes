import type { Metadata } from "next";
import { AddItem } from "./add-item";

export const metadata: Metadata = { title: "Nova peça" };

export default function AddPage() {
  return <AddItem />;
}
