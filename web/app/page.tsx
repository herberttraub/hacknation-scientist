"use client";

import { useState } from "react";
import {
  api,
  type ExperimentPlan,
  type PlanResponse,
  type QCResult,
} from "@/lib/api";
import FeedbackPanel from "@/components/FeedbackPanel";
import PlanWorkspace from "@/components/PlanWorkspace";
import QCCard from "@/components/QCCard";

const DEMO_QUESTIONS = [
  {
    label: "CRP biosensor",
    text: "A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing.",
  },
  {
    label: "Probiotic gut",
    text: "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.",
  },
  {
    label: "Trehalose cryo",
    text: "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.",
  },
  {
    label: "Sporomusa CO₂",
    text: "Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of −400mV vs SHE will fix CO₂ into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.",
  },
];

type Depth = "brief" | "standard" | "deep";

export default function Workspace() {
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [qc, setQc] = useState<QCResult | null>(null);
  const [planResp, setPlanResp] = useState<PlanResponse | null>(null);
  const [qcLoading, setQcLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan: ExperimentPlan | null = planResp?.plan ?? null;

  async function runQC() {
    if (!question.trim()) return;
    setError(null);
    setQc(null);
    setPlanResp(null);
    setQcLoading(true);
    try {
      const r = await api.qc(question);
      setQc(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setQcLoading(false);
    }
  }

  async function runPlan() {
    if (!question.trim()) return;
    setError(null);
    setPlanLoading(true);
    try {
      const r = await api.plan({
        question,
        depth,
        qc_status: qc?.status,
        qc_rationale: qc?.rationale,
        qc_references: qc?.references,
      });
      setPlanResp(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setPlanLoading(false);
    }
  }

  async function downloadExport(fmt: "pdf" | "docx" | "tex" | "md") {
    if (!planResp) return;
    window.open(api.exportPlan(planResp.plan_id, fmt), "_blank");
  }

  return (
    <main className="min-h-screen px-8 md:px-12 py-10 max-w-[1500px] mx-auto">
      <header className="mb-10">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="eyebrow">Challenge 04 · Fulcrum Science</div>
            <h1 className="text-5xl mt-1 font-serif">Husky Lab — AI Scientist</h1>
          </div>
          <div className="mono text-[11px] text-graphite/60">
            From hypothesis to runnable plan
          </div>
        </div>
        <div className="brass-rule mt-4" />
        <p className="mt-3 max-w-3xl font-serif text-lg italic text-graphite/80">
          Hypothesis &nbsp;→&nbsp; Literature&nbsp;QC &nbsp;→&nbsp; Runnable&nbsp;experiment&nbsp;plan.
        </p>
      </header>

      {/* INTAKE */}
      <section>
        <div className="eyebrow">Stage 01 · Intake</div>
        <div className="specimen-label">
          <h2 className="text-2xl font-serif">Your hypothesis</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {DEMO_QUESTIONS.map((q) => (
            <button
              key={q.label}
              className="ghost"
              onClick={() => setQuestion(q.text)}
              type="button"
            >
              {q.label}
            </button>
          ))}
        </div>

        <textarea
          rows={4}
          placeholder="State a precise, testable hypothesis. Specific intervention, measurable outcome, threshold, mechanistic reason, implied control."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">Depth</span>
            {(["brief", "standard", "deep"] as Depth[]).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={
                  "px-3 py-1 text-xs uppercase tracking-eyebrow border " +
                  (depth === d ? "border-brass text-brass" : "border-rule text-graphite/70")
                }
              >
                {d}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-3">
            <button
              className="ghost"
              onClick={runQC}
              disabled={qcLoading || !question.trim()}
            >
              {qcLoading ? "Running QC…" : "1 · Run literature QC"}
            </button>
            <button
              className="primary"
              onClick={runPlan}
              disabled={planLoading || !question.trim()}
            >
              {planLoading ? "Drafting plan…" : "2 · Generate plan"}
            </button>
          </div>
        </div>

        {error && (
          <p className="margin-note mt-4 text-xs">error: {error}</p>
        )}
      </section>

      {/* QC */}
      {qc && (
        <QCCard
          result={qc}
          question={question}
          onUpdate={setQc}
        />
      )}

      {/* PLAN */}
      {plan && planResp && (
        <>
          <PlanWorkspace
            plan={plan}
            meta={{
              experiment_type: planResp.experiment_type,
              grounding_used: planResp.grounding_used,
              team_examples_applied: planResp.team_examples_applied,
            }}
          />

          <FeedbackPanel
            planId={planResp.plan_id}
            onApplied={() => {
              /* nothing immediate — next plan_gen will pick up the feedback */
            }}
          />

          <section className="mt-12 mb-20">
            <div className="eyebrow">Stage 05 · Export</div>
            <div className="specimen-label">
              <h2 className="text-2xl font-serif">Take it with you</h2>
            </div>
            <div className="flex gap-3">
              <button className="ghost" onClick={() => downloadExport("pdf")}>PDF</button>
              <button className="ghost" onClick={() => downloadExport("docx")}>Word (.docx)</button>
              <button className="ghost" onClick={() => downloadExport("tex")}>LaTeX (.tex)</button>
              <button className="ghost" onClick={() => downloadExport("md")}>Markdown</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
