"use client";

import { useEffect, useState } from "react";
import { api, type ProtocolStep } from "@/lib/api";

type Props = {
  steps: ProtocolStep[];
  planId?: string;
  onMaterialClick?: (materialName: string) => void;
  onMore?: (stepId: string) => void;
  onLess?: (stepId: string) => void;
};

type SaveState = Record<string, "idle" | "saving" | "saved" | "rejected">;

export default function ProtocolList({ steps, planId, onMaterialClick, onMore, onLess }: Props) {
  const [drafts, setDrafts] = useState<ProtocolStep[]>(steps);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<SaveState>({});

  useEffect(() => {
    setDrafts(steps);
    setEditing({});
    setSaveState({});
  }, [steps]);

  if (drafts.length === 0) {
    return <div className="text-sm font-serif italic text-graphite/60">No protocol steps.</div>;
  }

  function updateStep(stepId: string, patch: Partial<ProtocolStep>) {
    setDrafts((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  }

  async function saveStep(original: ProtocolStep, current: ProtocolStep) {
    if (!planId) return;
    setSaveState((prev) => ({ ...prev, [current.id]: "saving" }));
    try {
      const r = await api.feedback({
        plan_id: planId,
        section: `protocol.${current.id}`,
        before: JSON.stringify(original),
        after: JSON.stringify(current),
        freeform_note: `Inline protocol edit for ${current.id}`,
      });
      setSaveState((prev) => ({ ...prev, [current.id]: r.accepted ? "saved" : "rejected" }));
      if (r.accepted) {
        setEditing((prev) => ({ ...prev, [current.id]: false }));
      }
    } catch {
      setSaveState((prev) => ({ ...prev, [current.id]: "rejected" }));
    }
  }

  return (
    <ol className="space-y-6">
      {drafts.map((s, idx) => {
        const original = steps.find((step) => step.id === s.id) ?? s;
        const isEditing = editing[s.id] ?? false;
        const state = saveState[s.id] ?? "idle";
        return (
          <li key={s.id} className="border-l border-brass pl-5 py-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <div className="mono text-xs text-brass uppercase tracking-eyebrow">{`Step ${idx + 1} - ${s.id}`}</div>
              <div className="mono text-[11px] text-graphite/60">
                {s.duration_minutes} min
              </div>
              {s.can_run_parallel_with.length > 0 && (
                <div className="mono text-[11px] text-sage">
                  parallel with {s.can_run_parallel_with.join(", ")}
                </div>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  className="ghost text-[11px] py-0.5 px-2"
                  onClick={() => setEditing((prev) => ({ ...prev, [s.id]: !isEditing }))}
                >
                  {isEditing ? "close edit" : "edit"}
                </button>
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

            {isEditing ? (
              <div className="mt-3 border border-rule p-3 bg-ivory/40">
                <label className="eyebrow">Step name</label>
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => updateStep(s.id, { name: e.target.value })}
                  className="mt-1"
                />
                <label className="eyebrow block mt-3">Rationale</label>
                <textarea
                  rows={4}
                  value={s.rationale}
                  onChange={(e) => updateStep(s.id, { rationale: e.target.value })}
                  className="mt-1"
                />
                <label className="eyebrow block mt-3">Notes</label>
                <textarea
                  rows={3}
                  value={s.notes || ""}
                  onChange={(e) => updateStep(s.id, { notes: e.target.value })}
                  className="mt-1"
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    className="primary"
                    disabled={!planId || state === "saving"}
                    onClick={() => saveStep(original, s)}
                  >
                    {state === "saving" ? "Saving..." : "Save inline edit"}
                  </button>
                  {state === "saved" && (
                    <span className="text-xs italic font-serif text-sage">
                      saved to team feedback
                    </span>
                  )}
                  {state === "rejected" && (
                    <span className="margin-note text-xs">
                      edit was not accepted
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h4 className="text-xl font-serif mt-1">{s.name}</h4>
                <p className="font-serif text-base mt-2 leading-relaxed text-graphite">
                  {s.rationale}
                </p>
                {s.notes && <p className="margin-note mt-3">{s.notes}</p>}
              </>
            )}

            {s.materials_used.length > 0 && (
              <div className="mt-3">
                <div className="eyebrow mb-1">Materials needed</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.materials_used.map((m, i) => (
                    <button
                      key={`m${i}`}
                      className="mono text-[10px] uppercase px-2 py-0.5 border border-rule text-graphite/80 hover:border-brass hover:text-brass"
                      onClick={() => onMaterialClick?.(m)}
                      type="button"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {s.equipment_used.length > 0 && (
              <div className="mt-3">
                <div className="eyebrow mb-1">Equipment needed</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.equipment_used.map((e, i) => (
                    <span key={`e${i}`} className="mono text-[10px] uppercase px-2 py-0.5 border border-brass text-brass">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {s.assumed_skills.length > 0 && (
              <div className="mt-2 text-xs italic font-serif text-graphite/70">
                <span className="eyebrow mr-2">Assumes</span>
                {s.assumed_skills.join(" - ")}
              </div>
            )}
            {s.qc_checks.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="eyebrow mr-2">QC</span>
                <span className="font-serif italic text-graphite/80">
                  {s.qc_checks.join(" - ")}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
