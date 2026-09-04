import { notFound } from "next/navigation";

import { LibraryLabClient } from "./library-lab-client";

export const dynamic = "force-dynamic";

export default function LibraryLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <LibraryLabClient />;
}
