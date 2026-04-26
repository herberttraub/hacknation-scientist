"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, type ExperimentPlan } from "@/lib/api";
import BudgetChart from "./BudgetChart";
import EquipmentRail from "./EquipmentRail";
import MaterialsTable from "./MaterialsTable";
import PriorWorkRail from "./PriorWorkRail";
import ProtocolList from "./ProtocolList";
import TimelineGantt from "./TimelineGantt";

type Props = {
  plan: ExperimentPlan;
  planId?: string;
  meta: { experiment_type: string; grounding_used: number; team_examples_applied: number };
  onRegenerate?: () => void;
  regenerating?: boolean;
};

type Tab = "overview" | "protocol" | "materials" | "budget" | "timeline" | "validation" | "staffing" | "prior" | "equipment" | "references";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "protocol", label: "Protocol" },
  { id: "materials", label: "Materials" },
  { id: "budget", label: "Budget" },
  { id: "timeline", label: "Timeline" },
  { id: "validation", label: "Validation" },
  { id: "staffing", label: "Staffing" },
  { id: "prior", label: "Connect with" },
  { id: "equipment", label: "Equipment" },
  { id: "references", label: "References" },
];

function Section({
  eyebrow,
  title,
  children,
  trustNote,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  trustNote?: string;
}) {
  return (
    <section>
      <div className="eyebrow">{eyebrow}</div>
      <div className="specimen-label">
        <h3 className="text-2xl font-serif">{title}</h3>
      </div>
      {trustNote && (
        <p className="margin-note text-xs mb-4 max-w-2xl">{trustNote}</p>
      )}
      {children}
    </section>
  );
}

function refHref(doi: string, url: string) {
  if (url) return url;
  if (doi) return `https://doi.org/${doi}`;
  return "";
}

const MATERIAL_LEAD_FALLBACK: Record<string, number> = {
  early: 21,
  middle: 10,
  late: 3,
};

function materialUseRows(plan: ExperimentPlan) {
  return plan.materials.map((material) => {
    const name = material.name.toLowerCase();
    const catalog = material.catalog_no.toLowerCase();
    const stepIndex = plan.protocol.findIndex((step) =>
      step.materials_used.some((used) => {
        const u = used.toLowerCase();
        return u.includes(name) || name.includes(u) || (!!catalog && u.includes(catalog));
      })
    );
    const step = stepIndex >= 0 ? plan.protocol[stepIndex] : null;
    const phaseIndex =
      stepIndex >= 0 && plan.protocol.length && plan.timeline.length
        ? Math.min(
            plan.timeline.length - 1,
            Math.floor((stepIndex / plan.protocol.length) * plan.timeline.length)
          )
        : -1;
    const phase = phaseIndex >= 0 ? plan.timeline[phaseIndex] : null;
    const leadDays = material.lead_time_days ?? MATERIAL_LEAD_FALLBACK[material.order_priority] ?? 10;
    return { material, stepIndex, step, phase, leadDays };
  });
}

export default function PlanWorkspace({ plan, planId, meta, onRegenerate, regenerating }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackState, setFeedbackState] = useState<"idle" | "saving" | "saved" | "rejected">("idle");
  const [focusMaterial, setFocusMaterial] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const env = plan.environmental_conditions;
  const totalWeeks = Math.max(...plan.timeline.map((p) => p.week_end), 0);

  useEffect(() => {
    function onClick(ev: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(ev.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [exportOpen]);

  function downloadExport(fmt: "pdf" | "docx" | "tex" | "md") {
    if (!planId) return;
    setExportOpen(false);
    window.open(api.exportPlan(planId, fmt), "_blank");
  }

  async function sendFeedback() {
    if (!planId || !feedbackNote.trim()) return;
    setFeedbackState("saving");
    try {
      const r = await api.feedback({
        plan_id: planId,
        section: tab,
        freeform_note: feedbackNote,
      });
      setFeedbackState(r.accepted ? "saved" : "rejected");
      if (r.accepted) setFeedbackNote("");
    } catch {
      setFeedbackState("rejected");
    }
  }

  function openMaterialsFor(name: string) {
    setFocusMaterial(name);
    setTab("materials");
  }

  function openEquipment() {
    setTab("equipment");
  }

  return (
    <section className="mt-4">
      <div className="eyebrow">Stage 04 - Generated Report</div>
      <div className="specimen-label flex items-start justify-between gap-4">
        <h2 className="text-4xl font-serif flex-1">{plan.title}</h2>
        <div className="flex items-start gap-2 shrink-0 mt-1">
          {onRegenerate && (
            <button
              type="button"
              className="ghost"
              onClick={onRegenerate}
              disabled={regenerating}
              title="Re-run /plan with the latest team feedback folded in"
            >
              {regenerating ? "Regenerating…" : "Regenerate ↻"}
            </button>
          )}
          <div className="relative" ref={exportRef}>
          <button
            type="button"
            className="primary"
            onClick={() => setExportOpen((v) => !v)}
            disabled={!planId}
          >
            Export {exportOpen ? "▴" : "▾"}
          </button>
          {exportOpen && planId && (
            <div className="absolute right-0 mt-1 z-20 bg-ivory border border-rule shadow-sm min-w-[180px]">
              {([
                ["pdf", "PDF"],
                ["docx", "Word (.docx)"],
                ["tex", "LaTeX (.tex)"],
                ["md", "Markdown"],
              ] as const).map(([fmt, label]) => (
                <button
                  key={fmt}
                  type="button"
                  className="block w-full text-left px-3 py-2 mono text-[11px] uppercase tracking-eyebrow text-graphite hover:text-brass hover:bg-ivory/80"
                  onClick={() => downloadExport(fmt)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
      <p className="font-serif italic text-base text-graphite/80 max-w-4xl">
        {plan.hypothesis}
      </p>
      <div className="mt-3 mono text-[11px] text-brass">
        experiment_type: {meta.experiment_type}
        <span className="text-graphite/60 ml-3">grounded on {meta.grounding_used} chunks</span>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-6 mt-8">
        <nav className="flex flex-col gap-1 border-r border-rule pr-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={
                "text-left px-3 py-2 mono text-[11px] uppercase tracking-eyebrow border-l-2 " +
                (tab === t.id
                  ? "border-brass text-brass"
                  : "border-transparent text-graphite/60 hover:text-brass")
              }
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          <div className="flex justify-end mb-3">
            <button
              className="primary"
              onClick={() => {
                setFeedbackOpen((v) => !v);
                setFeedbackState("idle");
              }}
            >
              Feedback on {TABS.find((t) => t.id === tab)?.label}
            </button>
          </div>

          {feedbackOpen && (
            <div className="mb-4 border border-brass bg-ivory/60 p-4 max-w-4xl">
              <div className="eyebrow">Contextual feedback</div>
              <p className="font-serif text-sm italic text-graphite/70 mt-1">
                Notes will be saved against the {TABS.find((t) => t.id === tab)?.label} section for future similar reports.
              </p>
              <textarea
                className="mt-3"
                rows={3}
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder={`What should change in ${TABS.find((t) => t.id === tab)?.label}?`}
              />
              <div className="mt-3 flex gap-3 items-center">
                <button className="primary" onClick={sendFeedback} disabled={!feedbackNote.trim() || feedbackState === "saving"}>
                  {feedbackState === "saving" ? "Saving..." : "Save feedback"}
                </button>
                {feedbackState === "saved" && <span className="text-xs italic font-serif text-sage">saved</span>}
                {feedbackState === "rejected" && <span className="margin-note text-xs">not saved</span>}
              </div>
            </div>
          )}

          {tab === "overview" && (
            <div className="space-y-8">
              <Section eyebrow="01 - Novelty" title="What's known, what's new">
                <p className="font-serif text-base leading-relaxed max-w-3xl text-graphite">
                  {plan.novelty_summary}
                </p>
              </Section>

              <Section eyebrow="02 - Environmental Conditions" title="Lab conditions to control for">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
                  <div className="border border-rule p-3 bg-ivory/40">
                    <div className="eyebrow">Temperature</div>
                    <div className="font-serif text-2xl mt-1 mono">
                      {env.temp_min_C}-{env.temp_max_C}C
                    </div>
                  </div>
                  {env.humidity_min_pct != null && (
                    <div className="border border-rule p-3 bg-ivory/40">
                      <div className="eyebrow">Humidity</div>
                      <div className="font-serif text-2xl mt-1 mono">
                        {env.humidity_min_pct}-{env.humidity_max_pct}%
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section eyebrow="03 - Execution Snapshot" title="Timeline at a glance">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
                  <div className="border border-rule p-3 bg-ivory/40">
                    <div className="eyebrow">Duration</div>
                    <div className="font-serif text-2xl mt-1 mono">{totalWeeks} weeks</div>
                  </div>
                  <div className="border border-rule p-3 bg-ivory/40">
                    <div className="eyebrow">Protocol</div>
                    <div className="font-serif text-2xl mt-1 mono">{plan.protocol.length} steps</div>
                  </div>
                  <div className="border border-rule p-3 bg-ivory/40">
                    <div className="eyebrow">Materials</div>
                    <div className="font-serif text-2xl mt-1 mono">{plan.materials.length} items</div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {tab === "protocol" && (
            <Section
              eyebrow="Protocol"
              title={`${plan.protocol.length} steps`}
              trustNote="Verify timing and step ordering against your equipment timing constants and parallelization opportunities."
            >
              <ProtocolList steps={plan.protocol} planId={planId} onMaterialClick={openMaterialsFor} onEquipmentClick={openEquipment} />
            </Section>
          )}

          {tab === "materials" && (
            <Section
              eyebrow="Materials"
              title="Reagents, supplies, catalog numbers"
              trustNote="Verify concentrations against your batch's certificate of analysis."
            >
              <MaterialsTable
                materials={plan.materials}
                protocol={plan.protocol}
                timeline={plan.timeline}
                focusMaterial={focusMaterial}
              />
            </Section>
          )}

          {tab === "budget" && (
            <Section eyebrow="Budget" title={`$${plan.budget.total_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`}>
              <BudgetChart budget={plan.budget} materials={plan.materials} />
              {plan.budget_justification && (
                <p className="margin-note mt-3 max-w-3xl">{plan.budget_justification}</p>
              )}
            </Section>
          )}

          {tab === "timeline" && (
            <Section
              eyebrow="Timeline"
              title={`${totalWeeks} weeks - ${plan.timeline.length} phases`}
              trustNote="Review for parallelization opportunities; some phases that look serial can run concurrently."
            >
              <TimelineGantt timeline={plan.timeline} />
              <ul className="mt-4 space-y-2 max-w-4xl">
                {plan.timeline.map((p, i) => (
                  <li key={i} className="text-sm">
                    <span className="mono text-[11px] text-brass">w{p.week_start}-w{p.week_end}</span>
                    <span className="ml-3 font-serif text-base text-graphite">{p.name}</span>
                    {p.deliverables.length > 0 && (
                      <span className="ml-2 text-xs italic font-serif text-graphite/70">
                        {p.deliverables.join("; ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <div className="eyebrow mb-2">Material ordering tied to timeline</div>
                <div className="border border-rule bg-ivory/40 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-ivory">
                        <th className="text-left px-3 py-2 eyebrow">Material</th>
                        <th className="text-left px-3 py-2 eyebrow">Order by</th>
                        <th className="text-left px-3 py-2 eyebrow">Needed for</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialUseRows(plan).map(({ material, stepIndex, step, phase, leadDays }) => (
                        <tr key={material.name} className="border-t border-rule">
                          <td className="px-3 py-2 font-serif">{material.name}</td>
                          <td className="px-3 py-2">
                            <div className="mono text-[11px] text-brass">{leadDays} days before use</div>
                            {phase && (
                              <div className="font-serif italic text-graphite/60">
                                before {phase.name} (w{phase.week_start}-w{phase.week_end})
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {step ? (
                              <>
                                <div className="mono text-[11px] text-brass">Step {stepIndex + 1}</div>
                                <div className="font-serif">{step.name}</div>
                              </>
                            ) : (
                              <span className="font-serif italic text-graphite/60">not mapped to a protocol step</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          )}

          {tab === "validation" && (
            <Section eyebrow="Validation" title="Validation">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
                <div className="border border-rule p-4 bg-ivory/40">
                  <div className="eyebrow">Success</div>
                  <ul className="mt-2 space-y-2">
                    {plan.validation.success_criteria.map((s, i) => (
                      <li key={i} className="font-serif text-base leading-relaxed">- {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="border border-rule p-4 bg-ivory/40">
                  <div className="eyebrow">Weaknesses / failure modes</div>
                  <ul className="mt-2 space-y-2">
                    {(plan.validation.failure_modes.length ? plan.validation.failure_modes : ["Assay interference, matrix effects, and reagent stability need stress testing."]).map((s, i) => (
                      <li key={i} className="font-serif text-base leading-relaxed">- {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="border border-rule p-4 bg-ivory/40">
                  <div className="eyebrow">Statistics</div>
                  <p className="mt-2 font-serif text-base leading-relaxed">
                    {plan.validation.statistics_plan || "Compare against the reference method using paired samples, report sensitivity/specificity, and include confidence intervals."}
                  </p>
                </div>
                <div className="border border-rule p-4 bg-ivory/40">
                  <div className="eyebrow">Open checks</div>
                  <ul className="mt-2 space-y-2">
                    {(plan.open_questions.length ? plan.open_questions : ["Confirm sample volume, operator skill assumptions, and batch-to-batch reagent variability."]).map((s, i) => (
                      <li key={i} className="font-serif text-base leading-relaxed">- {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>
          )}

          {tab === "staffing" && (
            <Section eyebrow="Staffing" title="People and skill coverage">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
                {[
                  { role: "Lead researcher", count: 1, involvement: 35, skills: ["assay design", "experimental controls", "data review"] },
                  { role: "Molecular biologist", count: 1, involvement: 45, skills: ["sample handling", "nucleic acid assay setup", "contamination control"] },
                  { role: "Lab assistant", count: 1, involvement: 60, skills: ["buffer prep", "materials tracking", "bench execution"] },
                  { role: "Data analyst", count: 1, involvement: 20, skills: ["calibration curves", "qRT-PCR comparison", "statistics"] },
                ].map((s) => (
                  <div key={s.role} className="border border-rule p-4 bg-ivory/40">
                    <div className="font-serif text-lg">{s.count} x {s.role}</div>
                    <div className="mono text-[11px] text-brass mt-1">{s.involvement}% involvement during active execution</div>
                    <div className="mt-2 text-sm text-graphite/80">{s.skills.join(" - ")}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {tab === "prior" && (
            <Section eyebrow="Connect with" title="People who can help">
              <PriorWorkRail staffing={plan.staffing} references={plan.references} />
            </Section>
          )}

          {tab === "equipment" && (
            <section>
              <div className="flex items-baseline justify-between mb-2 max-w-5xl">
                <div>
                  <div className="eyebrow">Equipment</div>
                  <div className="specimen-label">
                    <h3 className="text-2xl font-serif">Where to find equipment</h3>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary"
                  onClick={() => window.open("https://atlas.mit.edu/", "_blank")}
                >
                  Book Equipment / Lab →
                </button>
              </div>
              <EquipmentRail equipment={plan.equipment} />
            </section>
          )}

          {tab === "references" && (
            <Section eyebrow="References" title="Literature this plan stands on">
              <ol className="space-y-3 max-w-3xl">
                {plan.references.map((r, i) => {
                  const href = refHref(r.doi, r.url);
                  return (
                    <li key={i} className="text-sm">
                      <div className="font-serif text-base text-graphite">{r.title}</div>
                      <div className="italic text-graphite/70">
                        {r.authors}
                        {r.year ? ` - ${r.year}` : ""}
                      </div>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="mono text-[11px] text-brass underline decoration-brass"
                        >
                          {r.url || r.doi}
                        </a>
                      )}
                      {r.relevance && (
                        <p className="font-serif text-sm text-graphite/80 mt-1">{r.relevance}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}
        </div>
      </div>
    </section>
  );
}
