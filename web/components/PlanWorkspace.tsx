"use client";

import type { ExperimentPlan } from "@/lib/api";
import BudgetChart from "./BudgetChart";
import EquipmentRail from "./EquipmentRail";
import MaterialsTable from "./MaterialsTable";
import PriorWorkRail from "./PriorWorkRail";
import ProtocolList from "./ProtocolList";
import TimelineGantt from "./TimelineGantt";

type Props = {
  plan: ExperimentPlan;
  meta: { experiment_type: string; grounding_used: number; team_examples_applied: number };
};

function Section({
  eyebrow,
  title,
  children,
  trustNote,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  trustNote?: string;
}) {
  return (
    <section className="mt-10">
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

export default function PlanWorkspace({ plan, meta }: Props) {
  const env = plan.environmental_conditions;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 mt-12">
      {/* MAIN */}
      <div>
        <div className="eyebrow">Stage 03 · Experiment Plan</div>
        <h2 className="text-4xl font-serif mt-1">{plan.title}</h2>
        <div className="brass-rule mt-3 max-w-3xl" />
        <p className="font-serif italic text-base text-graphite/80 max-w-3xl mt-4">
          {plan.hypothesis}
        </p>
        <div className="mt-3 mono text-[11px] text-brass">
          experiment_type · {meta.experiment_type}
          <span className="text-graphite/60 ml-3">grounded on {meta.grounding_used} chunks</span>
        </div>
        {meta.team_examples_applied > 0 && (
          <div
            className="mt-4 max-w-3xl px-4 py-2 text-sm font-serif italic"
            style={{ background: "#9DAE94", color: "#2B2B2B" }}
          >
            <span className="eyebrow not-italic mr-2 text-graphite">Self-learning</span>
            this team&rsquo;s {meta.team_examples_applied} prior correction{meta.team_examples_applied === 1 ? "" : "s"} on similar plans
            were folded into this generation without re-prompting.
          </div>
        )}

        <Section eyebrow="01 · Novelty" title="What's known, what's new">
          <p className="font-serif text-base leading-relaxed max-w-3xl text-graphite">
            {plan.novelty_summary}
          </p>
        </Section>

        <Section eyebrow="02 · Environmental Conditions" title="Lab conditions to control for">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl">
            <div className="border border-rule p-3 bg-ivory/40">
              <div className="eyebrow">Temperature</div>
              <div className="font-serif text-2xl mt-1 mono">
                {env.temp_min_C}°–{env.temp_max_C}°C
              </div>
            </div>
            {env.humidity_min_pct != null && (
              <div className="border border-rule p-3 bg-ivory/40">
                <div className="eyebrow">Humidity</div>
                <div className="font-serif text-2xl mt-1 mono">
                  {env.humidity_min_pct}–{env.humidity_max_pct}%
                </div>
              </div>
            )}
            <div className="border border-rule p-3 bg-ivory/40">
              <div className="eyebrow">Atmosphere</div>
              <div className="font-serif text-base mt-1">{env.atmosphere || "—"}</div>
            </div>
            {env.light && (
              <div className="border border-rule p-3 bg-ivory/40">
                <div className="eyebrow">Light</div>
                <div className="font-serif text-base mt-1">{env.light}</div>
              </div>
            )}
            {env.season_sensitivity && (
              <div className="border border-rule p-3 bg-ivory/40 col-span-full">
                <div className="eyebrow">Season sensitivity</div>
                <div className="font-serif text-sm italic mt-1 text-graphite/80">
                  {env.season_sensitivity}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section
          eyebrow="03 · Protocol"
          title={`${plan.protocol.length} steps`}
          trustNote="Trust badge — verify timing and step ordering against your equipment timing constants and parallelization opportunities."
        >
          <ProtocolList steps={plan.protocol} />
        </Section>

        <Section
          eyebrow="04 · Materials"
          title="Reagents, supplies, catalog numbers"
          trustNote="Trust badge — verify concentrations against your batch's certificate of analysis."
        >
          <MaterialsTable materials={plan.materials} />
        </Section>

        <Section eyebrow="05 · Budget" title={`$${plan.budget.total_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`}>
          <BudgetChart budget={plan.budget} materials={plan.materials} />
          {plan.budget_justification && (
            <p className="margin-note mt-3 max-w-3xl">{plan.budget_justification}</p>
          )}
        </Section>

        <Section
          eyebrow="06 · Timeline"
          title={`${Math.max(...plan.timeline.map((p) => p.week_end), 0)} weeks · ${plan.timeline.length} phases`}
          trustNote="Trust badge — review for parallelization opportunities; some phases that look serial can run concurrently."
        >
          <TimelineGantt timeline={plan.timeline} />
          <ul className="mt-4 space-y-2 max-w-4xl">
            {plan.timeline.map((p, i) => (
              <li key={i} className="text-sm">
                <span className="mono text-[11px] text-brass">w{p.week_start}–w{p.week_end}</span>
                <span className="ml-3 font-serif text-base text-graphite">{p.name}</span>
                {p.deliverables.length > 0 && (
                  <span className="ml-2 text-xs italic font-serif text-graphite/70">
                    → {p.deliverables.join("; ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section eyebrow="07 · Validation" title="How we'll know it worked">
          <div className="max-w-3xl">
            <div className="eyebrow mb-1">Success criteria</div>
            <ul className="list-none">
              {plan.validation.success_criteria.map((s, i) => (
                <li key={i} className="font-serif text-base mt-1 leading-relaxed">
                  <span className="text-brass mr-2">◆</span>{s}
                </li>
              ))}
            </ul>
            {plan.validation.failure_modes.length > 0 && (
              <>
                <div className="eyebrow mt-4 mb-1">Failure modes</div>
                <ul className="list-none">
                  {plan.validation.failure_modes.map((s, i) => (
                    <li key={i} className="font-serif text-base mt-1 italic text-graphite/80">
                      <span className="text-brass mr-2">·</span>{s}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {plan.validation.statistics_plan && (
              <>
                <div className="eyebrow mt-4 mb-1">Statistics</div>
                <p className="font-serif text-base text-graphite leading-relaxed">
                  {plan.validation.statistics_plan}
                </p>
              </>
            )}
          </div>
        </Section>

        {plan.open_questions.length > 0 && (
          <Section eyebrow="08 · Open questions" title="Calibration left to the scientist">
            <ul className="space-y-2 max-w-3xl">
              {plan.open_questions.map((q, i) => (
                <li key={i} className="font-serif text-base italic text-graphite/80">
                  <span className="text-brass mr-2">?</span>{q}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {plan.references.length > 0 && (
          <Section eyebrow="09 · References" title="Literature this plan stands on">
            <ol className="space-y-2 max-w-3xl">
              {plan.references.map((r, i) => (
                <li key={i} className="text-sm">
                  <span className="font-serif text-base text-graphite">{r.title}</span>{" "}
                  <span className="italic text-graphite/70">
                    {r.authors}
                    {r.year ? ` · ${r.year}` : ""}
                  </span>
                  {(r.doi || r.url) && (
                    <div className="mono text-[11px] text-brass">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-brass">
                          {r.url}
                        </a>
                      ) : (
                        r.doi
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>

      {/* RIGHT RAIL */}
      <div className="space-y-6">
        <PriorWorkRail staffing={plan.staffing} />
        <EquipmentRail equipment={plan.equipment} />
      </div>
    </div>
  );
}
