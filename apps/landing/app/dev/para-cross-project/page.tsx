"use client";

import dynamic from "next/dynamic";

const ParaCrossProjectDriver = dynamic(
  () =>
    import("../../../components/dev/para-cross-project-driver").then(
      (module) => module.ParaCrossProjectDriver,
    ),
  { ssr: false },
);

export default function ParaCrossProjectPage() {
  return <ParaCrossProjectDriver />;
}
