import { redirect } from "next/navigation";

// Harness pages moved under /dev — keep the old URL working.
export default function MockIntegrationRedirect() {
  redirect("/dev/integrations-preview");
}
