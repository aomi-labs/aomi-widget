import { redirect } from "next/navigation";

export default function NewProjectPage() {
  redirect("/operate/deployments/new");
}
