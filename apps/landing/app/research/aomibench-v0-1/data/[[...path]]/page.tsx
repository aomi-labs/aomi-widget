import fs from "node:fs/promises";
import nodePath from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const DATA_ROOT = nodePath.join(
  process.cwd(),
  "public",
  "research",
  "aomibench-v0.1",
  "aombench_v1_data",
);
const PUBLIC_ROOT = "/research/aomibench-v0.1/aombench_v1_data";
const ROUTE_ROOT = "/research/aomibench-v0-1/data";

type DataEntry = {
  name: string;
  href: string;
  isDirectory: boolean;
  size: number | null;
};

function cleanSegments(segments: string[] = []) {
  return segments.filter(
    (segment) =>
      segment.length > 0 && segment !== "." && segment !== ".." && !segment.includes("/"),
  );
}

function publicHref(segments: string[]) {
  return `${PUBLIC_ROOT}/${segments.map(encodeURIComponent).join("/")}`;
}

function routeHref(segments: string[]) {
  if (segments.length === 0) {
    return ROUTE_ROOT;
  }

  return `${ROUTE_ROOT}/${segments.map(encodeURIComponent).join("/")}`;
}

async function readDirectory(segments: string[]) {
  const dir = nodePath.join(DATA_ROOT, ...segments);
  const relative = nodePath.relative(DATA_ROOT, dir);

  if (relative.startsWith("..") || nodePath.isAbsolute(relative)) {
    notFound();
  }

  let dirents;

  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    notFound();
  }

  const entries = await Promise.all(
    dirents
      .filter((dirent) => dirent.name !== ".DS_Store")
      .map(async (dirent): Promise<DataEntry> => {
        const entrySegments = [...segments, dirent.name];
        const isDirectory = dirent.isDirectory();
        const stat = isDirectory
          ? null
          : await fs.stat(nodePath.join(DATA_ROOT, ...entrySegments));

        return {
          name: dirent.name,
          href: isDirectory ? routeHref(entrySegments) : publicHref(entrySegments),
          isDirectory,
          size: stat?.size ?? null,
        };
      }),
  );

  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function formatBytes(size: number | null) {
  if (size === null) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = size / 1024;

  for (const unit of units) {
    if (value < 1024 || unit === "GB") {
      return `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
    }

    value /= 1024;
  }

  return `${size} B`;
}

async function collectDirectoryParams(
  dir: string,
  segments: string[] = [],
): Promise<Array<{ path?: string[] }>> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const params: Array<{ path?: string[] }> = [{ path: segments }];

  for (const dirent of dirents) {
    if (!dirent.isDirectory() || dirent.name === ".DS_Store") {
      continue;
    }

    params.push(
      ...(await collectDirectoryParams(nodePath.join(dir, dirent.name), [
        ...segments,
        dirent.name,
      ])),
    );
  }

  return params;
}

export const metadata: Metadata = {
  title: "AomiBench source data | Aomi Research",
};

export async function generateStaticParams() {
  try {
    return await collectDirectoryParams(DATA_ROOT);
  } catch {
    return [];
  }
}

export default async function AomiBenchDataPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const segments = cleanSegments(path);
  const entries = await readDirectory(segments);
  const title =
    segments.length === 0 ? "aombench_v1_data" : segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 text-foreground">
      <div className="mb-10 flex items-center justify-between gap-4">
        <Link
          href="/research/aomibench-v0-1"
          className="font-geist text-sm text-stone-500 underline underline-offset-2 hover:text-foreground dark:text-stone-300"
        >
          AomiBench article
        </Link>
        <Link
          href="/"
          aria-label="Aomi home"
          className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-foreground"
        >
          <img
            src="/assets/images/bubble.svg"
            alt=""
            className="h-5 w-5 dark:invert"
          />
          <span>aomi</span>
        </Link>
      </div>

      <h1 className="font-serif text-4xl leading-tight font-normal tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="font-geist mt-4 text-sm leading-6 text-stone-500 dark:text-stone-300">
        Browse AomiBench v0.1 source data files.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        {segments.length > 0 ? (
          <Link
            href={routeHref(parentSegments)}
            className="font-geist flex items-center justify-between border-b border-stone-200 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50 hover:text-foreground dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-900"
          >
            <span>../</span>
            <span>parent</span>
          </Link>
        ) : null}

        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="font-geist flex items-center justify-between gap-4 border-b border-stone-200 px-4 py-3 text-sm last:border-b-0 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900"
          >
            <span className="min-w-0 truncate">
              {entry.isDirectory ? `${entry.name}/` : entry.name}
            </span>
            <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
              {entry.isDirectory ? "directory" : formatBytes(entry.size)}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
