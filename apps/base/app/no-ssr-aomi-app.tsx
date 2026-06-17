"use client";

import dynamic from "next/dynamic";

export const NoSsrAomiApp = dynamic(
  () => import("./aomi-app").then((mod) => mod.AomiApp),
  {
    ssr: false,
  },
);
