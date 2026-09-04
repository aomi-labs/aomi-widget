"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Braces,
  ChevronRight,
  Loader2,
  Sparkles,
  WandSparkles,
  Wrench,
} from "lucide-react";
import { getSkillIcon } from "@/components/icons";
import {
  fetchSkillDetail,
  skillLabel,
  useSkillCatalog,
  type SkillDetail,
  type SkillSummary,
} from "@/lib/capabilities/skill-catalog";

function SkillIdentityIcon({
  skillId,
  className,
}: {
  skillId: string;
  className?: string;
}) {
  const Icon = getSkillIcon(skillId) ?? WandSparkles;
  return <Icon className={className} />;
}

function chainLabel(id: number): string {
  const known: Record<number, string> = {
    1: "Ethereum",
    10: "Optimism",
    137: "Polygon",
    143: "Monad",
    8453: "Base",
    42161: "Arbitrum",
    5042002: "Arc",
  };
  return known[id] ?? `Chain ${id}`;
}

export function SkillsLibrary({ query }: { query: string }) {
  const { skills, error, retry, loading } = useSkillCatalog();
  const [selected, setSelected] = useState<SkillSummary | null>(null);
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return skills ?? [];
    return (skills ?? []).filter((skill) =>
      `${skill.name} ${skill.description} ${skill.tags.join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, skills]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let active = true;
    setDetail(null);
    setDetailError(null);
    fetchSkillDetail(selected.id)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch(() => {
        if (active) setDetailError("Couldn’t load skill details.");
      });
    return () => {
      active = false;
    };
  }, [selected]);

  if (loading) {
    return (
      <div className="text-aomi-muted flex min-h-0 flex-1 items-center justify-center gap-2 text-[13px]">
        <Loader2 size={15} className="animate-spin" />
        Loading skills…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-[13px]">
        <p className="text-aomi-muted">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="bg-aomi-fg text-aomi-bg rounded-full px-4 py-2 font-medium transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="border-aomi-border relative mt-4 flex min-h-0 flex-1 overflow-hidden border-t">
      <section
        aria-label="Skills"
        className={`min-w-0 flex-1 overflow-y-auto pt-3 transition-[margin] ${selected ? "md:mr-[330px]" : ""}`}
      >
        <div className="border-aomi-border flex items-baseline gap-2 border-b pb-3 text-[13px] font-semibold">
          Aomi skills
          <span className="text-aomi-muted font-mono text-xs font-normal">
            {visible.length}
          </span>
        </div>
        {visible.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center text-[13px]">
            <WandSparkles className="text-aomi-muted mb-3 size-5" />
            <p className="font-medium">No skills found</p>
            <p className="text-aomi-muted mt-1">Try another capability.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 md:gap-x-7">
            {visible.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelected(skill)}
                className="border-aomi-border group flex min-h-[82px] items-center gap-3 border-b py-3 text-left"
              >
                <span className="border-aomi-overlay-border bg-aomi-surface-2 text-aomi-accent flex size-10 shrink-0 items-center justify-center rounded-xl border">
                  <SkillIdentityIcon
                    skillId={skill.id}
                    className="size-[18px]"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <span className="truncate">{skillLabel(skill)}</span>
                    {skill.injectedTools.length > 0 ? (
                      <span className="border-aomi-border text-aomi-muted shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium">
                        +{skill.injectedTools.length} tools
                      </span>
                    ) : null}
                  </span>
                  <span className="text-aomi-muted mt-0.5 line-clamp-2 text-xs leading-4">
                    {skill.description}
                  </span>
                </span>
                <ChevronRight className="text-aomi-muted size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <aside className="bg-aomi-raised border-aomi-border absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l md:w-[315px]">
          <div className="border-aomi-border flex items-center gap-2 border-b px-4 py-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Back to skills"
              className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg flex size-7 items-center justify-center rounded-full transition-colors"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="text-[13px] font-semibold">Skill details</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="border-aomi-overlay-border bg-aomi-surface-2 text-aomi-accent flex size-11 shrink-0 items-center justify-center rounded-xl border">
                <SkillIdentityIcon
                  skillId={selected.id}
                  className="size-[19px]"
                />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold">
                  {skillLabel(selected)}
                </h2>
                <p className="text-aomi-muted mt-0.5 text-[11px]">
                  Skill · Authored by Aomi
                </p>
              </div>
            </div>
            <p className="text-aomi-muted mt-4 text-xs leading-5">
              {selected.description}
            </p>

            {detailError ? (
              <p className="text-aomi-danger mt-4 text-xs">{detailError}</p>
            ) : !detail ? (
              <div className="text-aomi-muted mt-5 flex items-center gap-2 text-xs">
                <Loader2 size={13} className="animate-spin" />
                Loading details…
              </div>
            ) : (
              <>
                <DetailSection
                  icon={Sparkles}
                  title="When active"
                  values={
                    detail.chainIds.length > 0
                      ? detail.chainIds.map(chainLabel)
                      : ["Any supported chain"]
                  }
                />
                <DetailSection
                  icon={Wrench}
                  title="Uses app tools"
                  values={detail.toolNames}
                  empty="No required app tools"
                />
                <DetailSection
                  icon={Braces}
                  title="Adds tools"
                  values={detail.injectedTools}
                  empty="Instruction-only skill"
                  accent={detail.injectedTools.length > 0}
                />
                {detail.tags.length > 0 ? (
                  <div className="mt-5">
                    <h3 className="text-aomi-muted text-[10px] font-medium uppercase tracking-[0.08em]">
                      Tags
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {detail.tags.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className="bg-aomi-surface-2 text-aomi-muted rounded-full px-2 py-1 text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {detail.instructions ? (
                  <details className="border-aomi-border mt-5 border-t pt-4">
                    <summary className="cursor-pointer text-xs font-medium">
                      View skill instructions
                    </summary>
                    <pre className="bg-aomi-surface-2 text-aomi-muted mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl p-3 font-mono text-[10px] leading-4">
                      {detail.instructions}
                    </pre>
                  </details>
                ) : null}
              </>
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  values,
  empty,
  accent = false,
}: {
  icon: typeof Sparkles;
  title: string;
  values: string[];
  empty?: string;
  accent?: boolean;
}) {
  return (
    <section className="border-aomi-border mt-5 border-t pt-4">
      <h3 className="text-aomi-muted flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em]">
        <Icon size={12} />
        {title}
      </h3>
      {values.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {values.map((value) => (
            <li
              key={value}
              className={`break-all rounded-lg px-2.5 py-1.5 font-mono text-[10px] ${
                accent
                  ? "bg-aomi-accent/10 text-aomi-accent"
                  : "bg-aomi-surface-2 text-aomi-muted"
              }`}
            >
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-aomi-muted mt-2 text-[11px]">{empty ?? "None"}</p>
      )}
    </section>
  );
}
