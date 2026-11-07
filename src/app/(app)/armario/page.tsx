import type { Metadata } from "next";
import { ArmarioView } from "./armario-view";

export const metadata: Metadata = { title: "Armário" };

export default function ArmarioPage() {
  return <ArmarioView />;
}
