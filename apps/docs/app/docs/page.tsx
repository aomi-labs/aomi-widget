import { redirect } from "next/navigation";

import { defaultDocSlug } from "@/content/docs-map";

export default function DocsIndex() {
  redirect(`/docs/${defaultDocSlug}`);
}
