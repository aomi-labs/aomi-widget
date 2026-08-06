"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, getAppIcon } from "@aomi-labs/widget-lib";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  KeyRound,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import {
  categoryOf,
  categoryStyle,
  chainLabels,
  displayName,
  fetchSkills,
  formatTokens,
  monogram,
  type SkillSummary,
} from "./skills-data";
import {
  categoryDot,
  fetchPlugins,
  iconIdFor,
  pluginMonogram,
  type Plugin,
} from "./plugins-data";

type Tab = "plugins" | "skills";

const ALL = "All";

export function Marketplace() {
  const [tab, setTab] = useState<Tab>("plugins");

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="bg-muted/40 flex items-center gap-1 rounded-full p-1">
          <TabButton active={tab === "plugins"} onClick={() => setTab("plugins")}>
            Plugins
          </TabButton>
          <TabButton active={tab === "skills"} onClick={() => setTab("skills")}>
            Skills
          </TabButton>
        </div>
        <div className="flex items-center gap-2">
          <IconGhost title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </IconGhost>
          <IconGhost title="Settings">
            <Settings2 className="h-4 w-4" />
          </IconGhost>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {tab === "plugins" ? <PluginsTab /> : <SkillsTab />}
    </div>
  );
}

// ===========================================================================
// Plugins tab — the App Keys replacement
// ===========================================================================

type Scope = "public" | "personal";

function PluginsTab() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<Scope>("public");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Plugin | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchPlugins()
      .then((data) => {
        if (!cancelled) setPlugins(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scoped = useMemo(
    () => plugins.filter((p) => (scope === "personal" ? p.personal : true)),
    [plugins, scope],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of scoped) set.add(p.category);
    return [ALL, ...Array.from(set).sort()];
  }, [scoped]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((p) => {
      if (activeCategory !== ALL && p.category !== activeCategory) return false;
      if (!q) return true;
      return [p.title, p.id, p.description, p.category]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [scoped, query, activeCategory]);

  const installPublic = (id: string) => {
    setInstalled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveKey = (id: string, key: string) => {
    setKeys((current) => ({ ...current, [id]: key }));
    setInstalled((current) => new Set(current).add(id));
  };

  const removePlugin = (id: string) => {
    setInstalled((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setKeys((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const installedPlugins = plugins.filter((p) => installed.has(p.id));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Plugins
        </h1>
        <p className="text-muted-foreground text-sm leading-6">
          Connect Aomi to protocols, exchanges, and data. Public apps install in
          one click; proprietary apps unlock with an app key.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search plugins"
          className="border-input bg-muted/30 h-12 rounded-full border-2 pl-11 pr-4 text-sm shadow-none"
        />
      </div>

      {/* Installed row (like ChatGPT's Installed) */}
      {installedPlugins.length > 0 && (
        <div className="border-input bg-muted/20 flex items-center gap-3 rounded-2xl border px-4 py-3">
          <span className="text-muted-foreground shrink-0 text-xs font-medium uppercase tracking-wide">
            Installed
          </span>
          <div className="flex flex-wrap gap-2">
            {installedPlugins.map((plugin) => (
              <button
                key={plugin.id}
                type="button"
                onClick={() => setSelected(plugin)}
                title={plugin.title}
                className="hover:border-primary/40 border-input bg-background flex size-8 items-center justify-center overflow-hidden rounded-xl border"
              >
                <PluginGlyph plugin={plugin} className="size-5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Public / Personal + category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-muted/40 flex items-center gap-1 rounded-full p-1">
          <ScopeButton active={scope === "public"} onClick={() => setScope("public")}>
            Public
          </ScopeButton>
          <ScopeButton
            active={scope === "personal"}
            onClick={() => setScope("personal")}
          >
            Personal
          </ScopeButton>
        </div>
        <span className="text-muted-foreground/40">|</span>
        {categories.map((category) => {
          const active = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {scope === "personal" && scoped.length === 0 ? (
        <div className="border-input bg-muted/10 space-y-4 rounded-3xl border border-dashed p-8 text-center">
          <div className="bg-muted/40 mx-auto flex size-12 items-center justify-center rounded-2xl">
            <Rocket className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              No personal apps yet
            </p>
            <p className="text-muted-foreground mx-auto max-w-md text-sm leading-6">
              Apps you deploy from your own source show up here. Build one from
              the Deploy console.
            </p>
          </div>
          <a href="/deployments" className="inline-block">
            <Button type="button" size="sm" className="rounded-full">
              Open Deploy
            </Button>
          </a>
        </div>
      ) : (
        <>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {loading
                ? "Loading catalog…"
                : `${filtered.length} ${scope === "personal" ? "personal" : "public"} apps`}
            </span>
          </div>

          {!loading && filtered.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No plugins match “{query}”.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  installed={installed.has(plugin.id)}
                  onInstall={() => installPublic(plugin.id)}
                  onOpen={() => setSelected(plugin)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <PluginDetail
          plugin={selected}
          installed={installed.has(selected.id)}
          savedKey={keys[selected.id]}
          onInstallPublic={() => installPublic(selected.id)}
          onSaveKey={(key) => saveKey(selected.id, key)}
          onRemove={() => removePlugin(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PluginGlyph({
  plugin,
  className,
}: {
  plugin: Plugin;
  className?: string;
}) {
  const Icon = getAppIcon(iconIdFor(plugin));
  if (Icon) return <Icon className={className} />;
  return (
    <span className="text-muted-foreground text-xs font-semibold">
      {pluginMonogram(plugin)}
    </span>
  );
}

function AccessBadge({ isPublic }: { isPublic: boolean }) {
  return isPublic ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
      Open access
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-300">
      <KeyRound className="h-3 w-3" />
      API key
    </span>
  );
}

function PluginCard({
  plugin,
  installed,
  onInstall,
  onOpen,
}: {
  plugin: Plugin;
  installed: boolean;
  onInstall: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="border-input bg-background hover:border-primary/40 hover:bg-accent/30 flex min-w-0 cursor-pointer flex-col gap-3 rounded-3xl border p-5 text-left transition-colors"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="border-input bg-background flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border">
          <PluginGlyph plugin={plugin} className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="text-foreground truncate text-base font-medium">
              {plugin.title}
            </h3>
            <AccessBadge isPublic={plugin.isPublic} />
          </div>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-5">
            {plugin.description}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
          <span className={`size-1.5 shrink-0 rounded-full ${categoryDot(plugin.category)}`} />
          <span className="truncate">{plugin.category}</span>
        </span>
        {plugin.isPublic ? (
          <Button
            type="button"
            size="sm"
            variant={installed ? "secondary" : "outline"}
            onClick={(event) => {
              event.stopPropagation();
              onInstall();
            }}
            className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
          >
            {installed ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Installed
              </>
            ) : (
              "Install"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={installed ? "secondary" : "outline"}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
          >
            {installed ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Enabled
              </>
            ) : (
              "Get"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function PluginDetail({
  plugin,
  installed,
  savedKey,
  onInstallPublic,
  onSaveKey,
  onRemove,
  onClose,
}: {
  plugin: Plugin;
  installed: boolean;
  savedKey?: string;
  onInstallPublic: () => void;
  onSaveKey: (key: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [keyInput, setKeyInput] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="border-input bg-background max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-4">
          <div className="border-input bg-background flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border">
            <PluginGlyph plugin={plugin} className="size-9" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-foreground truncate text-xl font-semibold">
                {plugin.title}
              </h2>
              <AccessBadge isPublic={plugin.isPublic} />
            </div>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${categoryDot(plugin.category)}`} />
                {plugin.category}
              </span>
              {plugin.websiteUrl && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <a
                    href={plugin.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground inline-flex items-center gap-1"
                  >
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-accent -mr-1 -mt-1 rounded-full p-1.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-foreground mt-4 text-sm leading-6">
          {plugin.description}
        </p>

        {/* Enable section */}
        <div className="border-input bg-muted/20 mt-5 space-y-3 rounded-2xl border p-4">
          {plugin.isPublic ? (
            <>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <p className="text-foreground text-sm font-medium">
                  Open access — no key required
                </p>
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                This app is public. Install it to add it to your workspace and
                start using it in chat.
              </p>
              <Button
                type="button"
                size="sm"
                variant={installed ? "secondary" : "default"}
                onClick={onInstallPublic}
                className="gap-1.5 rounded-full"
              >
                {installed ? (
                  <>
                    <Check className="h-4 w-4" />
                    Installed
                  </>
                ) : (
                  <>
                    Install
                    <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <KeyRound className="text-amber-500 h-4 w-4" />
                <p className="text-foreground text-sm font-medium">
                  Requires an app key
                </p>
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                {plugin.title} is proprietary. Enter an app key to enable it — it
                is stored as an <code>Aomi-App-Key</code> scoped to this app.
              </p>
              {installed ? (
                <div className="space-y-3">
                  <div className="border-input bg-background flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
                    <span className="text-muted-foreground font-mono text-xs">
                      {maskKey(savedKey)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300">
                      <Check className="h-3.5 w-3.5" />
                      Enabled
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onRemove}
                    className="rounded-full"
                  >
                    Remove key
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="password"
                    value={keyInput}
                    onChange={(event) => setKeyInput(event.target.value)}
                    placeholder="Paste app key"
                    className="border-input bg-background h-10 flex-1 rounded-xl border-2 px-3 text-sm shadow-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (keyInput.trim()) onSaveKey(keyInput.trim());
                    }}
                    disabled={!keyInput.trim()}
                    className="h-10 shrink-0 rounded-full px-4"
                  >
                    Enable
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function maskKey(key?: string): string {
  if (!key) return "••••••••";
  const tail = key.slice(-4);
  return `${"•".repeat(Math.max(4, key.length - 4))}${tail}`;
}

function ScopeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ===========================================================================
// Skills tab
// ===========================================================================

function SkillsTab() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [activated, setActivated] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SkillSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchSkills()
      .then((data) => {
        if (!cancelled) setSkills(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const skill of skills) set.add(categoryOf(skill));
    return [ALL, ...Array.from(set).sort()];
  }, [skills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((skill) => {
      if (activeCategory !== ALL && categoryOf(skill) !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return [displayName(skill), skill.id, skill.description, ...skill.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [skills, query, activeCategory]);

  const toggleActivated = (id: string) => {
    setActivated((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activatedSkills = skills.filter((skill) => activated.has(skill.id));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Skills
        </h1>
        <p className="text-muted-foreground text-sm leading-6">
          Protocol playbooks that teach Aomi how to act on-chain. Browse the
          global catalog and preview what each one injects.
        </p>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search skills"
          className="border-input bg-muted/30 h-12 rounded-full border-2 pl-11 pr-4 text-sm shadow-none"
        />
      </div>

      {activatedSkills.length > 0 && (
        <div className="border-input bg-muted/20 flex items-center gap-3 rounded-2xl border px-4 py-3">
          <span className="text-muted-foreground shrink-0 text-xs font-medium uppercase tracking-wide">
            Activated
          </span>
          <div className="flex flex-wrap gap-2">
            {activatedSkills.map((skill) => {
              const style = categoryStyle(categoryOf(skill));
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => setSelected(skill)}
                  className={`flex size-8 items-center justify-center rounded-xl text-xs font-semibold ${style.tile}`}
                  title={displayName(skill)}
                >
                  {monogram(skill)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Sparkles className="h-3.5 w-3.5" />
        <span>
          {loading
            ? "Loading catalog…"
            : `${filtered.length} of ${skills.length} skills · global catalog · read-only`}
        </span>
      </div>

      {!loading && filtered.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          No skills match “{query}”.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              activated={activated.has(skill.id)}
              onToggleActivated={() => toggleActivated(skill.id)}
              onOpen={() => setSelected(skill)}
            />
          ))}
        </div>
      )}

      {selected && (
        <SkillDetail
          skill={selected}
          activated={activated.has(selected.id)}
          onToggleActivated={() => toggleActivated(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SkillCard({
  skill,
  activated,
  onToggleActivated,
  onOpen,
}: {
  skill: SkillSummary;
  activated: boolean;
  onToggleActivated: () => void;
  onOpen: () => void;
}) {
  const category = categoryOf(skill);
  const style = categoryStyle(category);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="border-input bg-background hover:border-primary/40 hover:bg-accent/30 flex min-w-0 cursor-pointer flex-col gap-3 rounded-3xl border p-5 text-left transition-colors"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${style.tile}`}
        >
          {monogram(skill)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground truncate text-base font-medium">
            {displayName(skill)}
          </h3>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-5">
            {skill.description}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs">
          <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
          <span className="truncate">{category}</span>
          <span className="text-muted-foreground/50 shrink-0">·</span>
          <span className="shrink-0 whitespace-nowrap">
            ~{formatTokens(skill.est_tokens)} tok
          </span>
        </span>
        <Button
          type="button"
          size="sm"
          variant={activated ? "secondary" : "outline"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleActivated();
          }}
          className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
        >
          {activated ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Activated
            </>
          ) : (
            "Activate"
          )}
        </Button>
      </div>
    </div>
  );
}

function SkillDetail({
  skill,
  activated,
  onToggleActivated,
  onClose,
}: {
  skill: SkillSummary;
  activated: boolean;
  onToggleActivated: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const category = categoryOf(skill);
  const style = categoryStyle(category);
  const chains = chainLabels(skill.chain_ids);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="border-input bg-background max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border p-6 shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ${style.tile}`}
          >
            {monogram(skill)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-foreground text-xl font-semibold">
              {displayName(skill)}
            </h2>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${style.dot}`} />
                {category}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <code className="text-muted-foreground/80">{skill.id}</code>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-accent -mr-1 -mt-1 rounded-full p-1.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-foreground mt-4 text-sm leading-6">
          {skill.description}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Meta label="Context" value={`~${formatTokens(skill.est_tokens)} tok`} />
          <Meta label="Tools" value={`${skill.injected_tools.length}`} />
          <Meta
            label="Chains"
            value={chains.length > 0 ? `${chains.length}` : "L1"}
          />
        </div>

        {chains.length > 0 && (
          <Section title="Networks">
            <div className="flex flex-wrap gap-2">
              {chains.map((chain) => (
                <span
                  key={chain}
                  className="border-input text-muted-foreground rounded-full border px-2.5 py-1 text-xs"
                >
                  {chain}
                </span>
              ))}
            </div>
          </Section>
        )}

        <Section title="Tags">
          <div className="flex flex-wrap gap-2">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="bg-muted/50 text-muted-foreground rounded-full px-2.5 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Injected tools">
          <div className="flex flex-wrap gap-2">
            {skill.injected_tools.map((tool) => (
              <code
                key={tool}
                className="border-input text-foreground rounded-lg border px-2 py-1 font-mono text-xs"
              >
                {tool}
              </code>
            ))}
          </div>
        </Section>

        <div className="border-input bg-muted/20 mt-5 flex items-start gap-2 rounded-2xl border p-3">
          <Sparkles className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-muted-foreground text-xs leading-5">
            Skills activate automatically at the agent layer when their protocol
            is in play — there is no per-account enable yet. “Activate” here is a
            preview toggle.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activated ? "secondary" : "default"}
            onClick={onToggleActivated}
            className="gap-1.5 rounded-full"
          >
            {activated ? (
              <>
                <Check className="h-4 w-4" />
                Activated
              </>
            ) : (
              <>
                Activate
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Shared bits
// ===========================================================================

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-input bg-muted/20 rounded-2xl border px-3 py-2.5">
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 space-y-2">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function IconGhost({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-9 items-center justify-center rounded-full transition-colors"
    >
      {children}
    </button>
  );
}
