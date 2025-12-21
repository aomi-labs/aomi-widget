import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2, ExternalLink, Github, Palette, Plug, Sparkles } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from "@aomi-labs/widget-lib";
import { Preview } from "@docs/components/playground/Preview";

const installSnippet = `pnpm add @aomi-labs/widget-lib @assistant-ui/react @assistant-ui/react-markdown @tanstack/react-query @radix-ui/react-dialog @radix-ui/react-slot @radix-ui/react-avatar @radix-ui/react-separator @radix-ui/react-tooltip framer-motion motion lucide-react react-shiki remark-gfm tailwindcss zustand`;

const frameCode = `import "@aomi-labs/widget-lib/styles.css";
import { AomiFrame } from "@aomi-labs/widget-lib";

export function Assistant() {
  return <AomiFrame height="640px" width="100%" />;
}`;

const buttonsCode = `import { Button, Badge } from "@aomi-labs/widget-lib";

export function Buttons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Badge>Badge</Badge>
    </div>
  );
}`;

const cardCode = `import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@aomi-labs/widget-lib";

export function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}`;

const quickstart = [
  {
    title: "Install",
    body: "Add the widget library and peers to your app. Tailwind v4 works out of the box.",
    cta: "Copy install command",
    href: "#install",
  },
  {
    title: "Import styles",
    body: "Pull in @aomi-labs/widget-lib/styles.css so tokens, radius, and base styles apply everywhere.",
    cta: "Theming guide",
    href: "#theming",
  },
  {
    title: "Drop the frame",
    body: "Render <AomiFrame /> inside your app; optional slots for wallet footers and tools.",
    cta: "Component docs",
    href: "#components",
  },
];

const previews = [
  {
    title: "AomiFrame shell",
    description: "Chat surface + thread list with sensible defaults.",
    code: frameCode,
    badge: "Core",
    component: <FrameMock />,
  },
  {
    title: "Buttons & badges",
    description: "Use shadcn-style primitives or your own variants.",
    code: buttonsCode,
    component: <ButtonShowcase />,
  },
  {
    title: "Cards & skeletons",
    description: "Compose docs blocks, templates, and loading states quickly.",
    code: cardCode,
    component: <CardSkeletonShowcase />,
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="grid-sheen absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-14">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 px-5 py-4 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Aomi Widget</p>
              <p className="text-xs text-muted-foreground">Docs & playground (Phase 2)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="https://github.com/aomi-labs" target="_blank" className="gap-2">
                <Github className="size-4" />
                GitHub
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="#install" className="gap-2">
                <ArrowRight className="size-4" />
                Get started
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6 rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur">
            <Badge className="rounded-full bg-primary/10 text-primary">Docs & playground</Badge>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Ship the onchain chat surface and keep the docs in sync.
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Build, preview, and copy-ready snippets for every widget export—without losing sight of the runtime and
                wallet wiring that make it production-ready.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {quickstart.map((item) => (
                <Card key={item.title} className="border-border/60 bg-background/50">
                  <CardHeader className="gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="size-4 text-primary" />
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-sm">{item.body}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="ghost" size="sm" className="gap-2 text-primary">
                      <Link href={item.href}>
                        {item.cta}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Live playground</p>
                <p className="text-xs text-muted-foreground">
                  Swap between code and preview, then copy into your app.
                </p>
              </div>
              <Badge className="rounded-full bg-muted text-muted-foreground" id="install">
                pnpm workspace
              </Badge>
            </div>
            <div className="rounded-2xl border border-border/60 bg-slate-950 px-4 py-3 font-mono text-xs text-slate-100 shadow-inner">
              <div className="flex items-center justify-between text-[0.78rem] uppercase tracking-[0.12em] text-slate-300">
                <span>Install</span>
                <Link href="https://www.npmjs.com/package/@aomi-labs/widget-lib" className="flex items-center gap-1 text-slate-200 underline-offset-4 hover:underline">
                  npm
                  <ExternalLink className="size-3" />
                </Link>
              </div>
              <Separator className="my-3 bg-slate-800" />
              <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">{installSnippet}</pre>
            </div>
            <div className="rounded-2xl border border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm text-primary">
            Import <code className="font-mono text-primary">&quot;@aomi-labs/widget-lib/styles.css&quot;</code> inside your
            docs app entrypoint so theme tokens and base styles apply.
          </div>
          </div>
        </section>

        <section className="space-y-6" id="components">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Playground</p>
              <h2 className="text-2xl font-semibold">Component previews</h2>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="#theming">
                <Palette className="size-4" />
                Theme tokens
              </Link>
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {previews.map((preview) => (
              <Preview
                key={preview.title}
                title={preview.title}
                description={preview.description}
                code={preview.code}
                badge={preview.badge}
              >
                {preview.component}
              </Preview>
            ))}
          </div>
        </section>

        <section className="space-y-5" id="theming">
          <div className="flex items-center gap-3">
            <Palette className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Theming</p>
              <h3 className="text-xl font-semibold">Use your tokens or ours</h3>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/70">
              <CardHeader className="gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code2 className="size-4 text-primary" />
                  Import styles
                </CardTitle>
                <CardDescription>
                  Theme variables live in <code className="font-mono text-sm">src/themes/default.css</code>. Override{" "}
                  <code className="font-mono text-sm">--font-*</code>, radius, and palette in your app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs text-muted-foreground">
                <p>@import &quot;@aomi-labs/widget-lib/styles.css&quot;;</p>
                <p>{`/* or @import "../../../src/styles.css"; while developing locally */`}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/70">
              <CardHeader className="gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plug className="size-4 text-primary" />
                  Source-aware Tailwind
                </CardTitle>
                <CardDescription>
                  The docs app points Tailwind&apos;s <code className="font-mono text-sm">@source</code> at{" "}
                  <code className="font-mono text-sm">../../src</code> so new classes in the library show up instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Keep <code className="font-mono text-xs">NEXT_PUBLIC_BACKEND_URL</code> handy when previewing the live
                frame; otherwise the UI renders with mock data only.
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4" id="guides">
          <div className="flex items-center gap-3">
            <BookOpen className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Docs map</p>
              <h3 className="text-xl font-semibold">What&apos;s coming in this workspace</h3>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <GuideCard
              icon={<ExternalLink className="size-4 text-primary" />}
              title="Getting started"
              body="Environment variables, providers, and peer deps to keep the assistant online."
              href="#install"
            />
            <GuideCard
              icon={<Palette className="size-4 text-primary" />}
              title="Theme packs"
              body="Swap palettes via CSS variables, extend tokens, and preview light/dark pairs."
              href="#theming"
            />
            <GuideCard
              icon={<Code2 className="size-4 text-primary" />}
              title="Component API"
              body="Props tables and live previews for AomiFrame, assistant surfaces, and UI primitives."
              href="#components"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function FrameMock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 text-xs text-muted-foreground">
        <span>Thread list</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">Live</span>
      </div>
      <div className="grid gap-0 border-b border-border/60 bg-muted/40 px-3 py-3">
        <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
          <div>
            <p className="text-sm font-semibold">New Chat</p>
            <p className="text-xs text-muted-foreground">Waiting for first message</p>
          </div>
          <Badge className="rounded-full bg-primary/15 text-primary">active</Badge>
        </div>
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-10/12" />
          <Skeleton className="h-3 w-8/12" />
        </div>
      </div>
      <div className="space-y-3 bg-card px-4 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          Backend polling enabled
        </div>
        <div className="rounded-xl border border-dashed border-border/60 bg-background px-4 py-3 text-sm">
          Thread, sidebar, and composer live inside <code className="font-mono text-primary">AomiFrame</code>. Bring
          your own wallet footer or keep the defaults.
        </div>
      </div>
    </div>
  );
}

function ButtonShowcase() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Badge>Badge</Badge>
    </div>
  );
}

function CardSkeletonShowcase() {
  return (
    <Card className="border-border/60 bg-background/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Wallet summary</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Mock state while fetching balances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}

function GuideCard({ icon, title, body, href }: { icon: ReactNode; title: string; body: string; href: string }) {
  return (
    <Card className="group border-border/60 bg-card/70 transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{body}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" variant="ghost" className="gap-2 text-primary">
          <Link href={href}>
            Explore
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
