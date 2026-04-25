"use client";

import type { ProtocolStep } from "@/lib/api";

type Props = {
  steps: ProtocolStep[];
  onMore?: (stepId: string) => void;
  onLess?: (stepId: string) => void;
};

export default function ProtocolList({ steps, onMore, onLess }: Props) {
  if (steps.length === 0)
    return <div className="text-sm font-serif italic text-graphite/60">No protocol steps.</div>;

  return (
    <ol className="space-y-6">
      {steps.map((s, idx) => (
        <li key={s.id} className="border-l border-brass pl-5 py-1">
          <div className="flex items-baseline gap-3">
            <div className="mono text-xs text-brass uppercase tracking-eyebrow">{`Step ${idx + 1} · ${s.id}`}</div>
            <div className="mono text-[11px] text-graphite/60">
              {s.duration_minutes} min
            </div>
            {s.can_run_parallel_with.length > 0 && (
              <div className="mono text-[11px] text-sage">
                ‖ parallel with {s.can_run_parallel_with.join(", ")}
              </div>
            )}
            <div className="ml-auto flex gap-2">
              {onMore && (
                <button className="ghost text-[11px] py-0.5 px-2" onClick={() => onMore(s.id)}>
                  more detail
                </button>
              )}
              {onLess && (
                <button className="ghost text-[11px] py-0.5 px-2" onClick={() => onLess(s.id)}>
                  less detail
                </button>
              )}
            </div>
          </div>
          <h4 className="text-xl font-serif mt-1">{s.name}</h4>
          <p className="font-serif text-base mt-2 leading-relaxed text-graphite">
            {s.rationale}
          </p>
          {s.notes && (
            <p className="margin-note mt-3">{s.notes}</p>
          )}
          {(s.materials_used.length > 0 || s.equipment_used.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.materials_used.map((m, i) => (
                <span key={`m${i}`} className="mono text-[10px] uppercase px-2 py-0.5 border border-rule text-graphite/80">
                  {m}
                </span>
              ))}
              {s.equipment_used.map((e, i) => (
                <span key={`e${i}`} className="mono text-[10px] uppercase px-2 py-0.5 border border-brass text-brass">
                  {e}
                </span>
              ))}
            </div>
          )}
          {s.assumed_skills.length > 0 && (
            <div className="mt-2 text-xs italic font-serif text-graphite/70">
              <span className="eyebrow mr-2">Assumes</span>
              {s.assumed_skills.join(" · ")}
            </div>
          )}
          {s.qc_checks.length > 0 && (
            <div className="mt-2 text-xs">
              <span className="eyebrow mr-2">QC</span>
              <span className="font-serif italic text-graphite/80">
                {s.qc_checks.join(" · ")}
              </span>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
