import { redirect } from "next/navigation";

import { defaultDocSlug } from "@docs/content/docs-map";

export default function DocsIndex() {
  redirect(`/docs/${defaultDocSlug}`);
}
