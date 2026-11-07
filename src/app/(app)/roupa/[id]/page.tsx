import type { Metadata } from "next";
import { EditItem } from "./edit-item";

export const metadata: Metadata = { title: "Editar peça" };

export default async function EditItemPage({ params }: PageProps<"/roupa/[id]">) {
  const { id } = await params;
  return <EditItem id={id} />;
}
