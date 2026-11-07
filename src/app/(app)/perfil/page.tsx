import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ProfileView } from "./profile-view";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  return <ProfileView name={user.name} email={user.email} />;
}
