"use client";

import { useEffect, useState } from "react";
import {
  api,
  type ExperimentPlan,
  type HistoryItem,
  type PlanResponse,
  type QCResult,
} from "@/lib/api";
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
    label: "Sporomusa CO2",
    text: "Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of -400mV vs SHE will fix CO2 into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.",
  },
];

type Depth = "brief" | "standard" | "deep";
type Screen = "intake" | "qc" | "configure" | "report";

const DEPTH_LABEL: Record<Depth, string> = {
  brief: "Shallow",
  standard: "Regular",
  deep: "Deep",
};

export default function Workspace() {
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [screen, setScreen] = useState<Screen>("intake");
  const [qc, setQc] = useState<QCResult | null>(null);
  const [planResp, setPlanResp] = useState<PlanResponse | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [qcLoading, setQcLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan: ExperimentPlan | null = planResp?.plan ?? null;

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const r = await api.history(3);
      setHistory(r.items ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function runQC() {
    if (!question.trim()) return;
    setError(null);
    setQc(null);
    setPlanResp(null);
    setScreen("intake");
    setQcLoading(true);
    try {
      let r: QCResult;
      if (sourceFile || sourceUrl.trim()) {
        const fd = new FormData();
        fd.append("question", question);
        if (sourceUrl.trim()) fd.append("source_url", sourceUrl.trim());
        if (sourceFile) fd.append("file", sourceFile);
        r = await api.qcWithSource(fd);
      } else {
        r = await api.qc(question);
      }
      setQc(r);
      setScreen("qc");
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
      setScreen("report");
      loadHistory();
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

  function updateQuestion(next: string) {
    setQuestion(next);
    setQc(null);
    setPlanResp(null);
  }

  function restoreHistory(item: HistoryItem) {
    setQuestion(item.question);
    setDepth(item.depth);
    setQc(null);
    setPlanResp({
      plan_id: item.plan_id,
      query_id: item.query_id,
      plan: item.plan,
      experiment_type: item.experiment_type,
      domain: item.domain,
      grounding_used: item.grounding_used,
      team_examples_applied: item.team_examples_applied,
    });
    setHistoryOpen(false);
    setScreen("report");
  }

  function canVisit(target: Screen) {
    if (target === "intake") return true;
    if (target === "qc") return !!qc;
    if (target === "configure") return !!qc;
    if (target === "report") return !!planResp;
    return false;
  }

  function goTo(target: Screen) {
    if (canVisit(target)) setScreen(target);
  }

  return (
    <main className="min-h-screen px-8 md:px-12 py-10 max-w-[1500px] mx-auto">
      <header className="mb-10">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="eyebrow">Challenge 04 - Fulcrum Science</div>
            <h1 className="text-5xl mt-1 font-serif">Husky Lab - AI Scientist</h1>
          </div>
          <div className="mono text-[11px] text-graphite/60">
            <button
              className="ghost"
              onClick={() => {
                setHistoryOpen((v) => !v);
                if (!historyOpen) loadHistory();
              }}
              type="button"
            >
              Recent history
            </button>
          </div>
        </div>
        {historyOpen && (
          <div className="mt-4 ml-auto max-w-xl border border-rule bg-ivory/95 p-4">
            <div className="eyebrow">Last three generated reports</div>
            {historyLoading && <p className="mt-2 font-serif italic text-sm text-graphite/70">Loading history...</p>}
            {!historyLoading && history.length === 0 && (
              <p className="mt-2 font-serif italic text-sm text-graphite/70">No saved reports yet.</p>
            )}
            <div className="mt-3 space-y-2">
              {history.map((item) => (
                <button
                  key={item.plan_id}
                  className="w-full border border-rule bg-transparent p-3 text-left hover:border-brass"
                  onClick={() => restoreHistory(item)}
                  type="button"
                >
                  <div className="font-serif text-base text-graphite line-clamp-2">{item.plan.title}</div>
                  <div className="mono mt-1 text-[11px] text-brass">
                    {DEPTH_LABEL[item.depth]} report
                    {item.created_at ? ` - ${new Date(item.created_at).toLocaleString()}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-graphite/70 line-clamp-1">{item.question}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="brass-rule mt-4" />
        <p className="mt-3 max-w-3xl font-serif text-lg italic text-graphite/80">
          Hypothesis to literature QC to runnable experiment plan.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ["intake", "1 Intake"],
          ["qc", "2 Literature QC"],
          ["configure", "3 Report Depth"],
          ["report", "4 Report"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => goTo(id as Screen)}
            disabled={!canVisit(id as Screen)}
            className={
              "border px-3 py-2 mono text-[11px] uppercase text-left " +
              (screen === id ? "border-brass text-brass" : "border-rule text-graphite/50") +
              (canVisit(id as Screen) ? " cursor-pointer hover:border-brass" : " opacity-50 cursor-not-allowed")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 border border-brass px-4 py-3 bg-ivory/60">
          <div className="eyebrow">Request failed</div>
          <p className="mt-1 font-serif text-sm text-graphite">{error}</p>
        </div>
      )}

      {screen === "intake" && (
        <section>
          <div className="eyebrow">Stage 01 - Intake</div>
          <div className="specimen-label">
            <h2 className="text-2xl font-serif">Natural language hypothesis</h2>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {DEMO_QUESTIONS.map((q) => (
              <button
                key={q.label}
                className="ghost"
                onClick={() => updateQuestion(q.text)}
                type="button"
              >
                {q.label}
              </button>
            ))}
          </div>

          <textarea
            rows={5}
            placeholder="Describe what you want to test in natural language."
            value={question}
            onChange={(e) => updateQuestion(e.target.value)}
          />
          <div className="mt-4 border border-rule bg-ivory/40 p-4">
            <div className="eyebrow">Optional supporting document</div>
            <p className="mt-1 font-serif text-sm italic text-graphite/70 max-w-3xl">
              Add a paper, notes, dataset summary, or source link if the review should narrow around your own context.
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <input
                type="text"
                placeholder="Paste a source URL or DOI"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
              <label className="ghost border border-rule px-3 py-2 text-sm cursor-pointer hover:border-brass hover:text-brass">
                Upload file
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,.csv,.json"
                  onChange={(e) => setSourceFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            {sourceFile && (
              <div className="mt-2 mono text-[11px] text-brass">
                Attached: {sourceFile.name}
                <button className="ml-3 underline" type="button" onClick={() => setSourceFile(null)}>
                  remove
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              className="primary"
              onClick={runQC}
              disabled={qcLoading || !question.trim()}
            >
              {qcLoading ? "Running QC..." : "Run literature QC"}
            </button>
          </div>
        </section>
      )}

      {screen === "qc" && qc && (
        <>
          <QCCard result={qc} question={question} onUpdate={setQc} />
          <div className="mt-8 flex justify-between">
            <button className="ghost" onClick={() => setScreen("intake")}>
              Edit hypothesis
            </button>
            <button className="primary" onClick={() => setScreen("configure")}>
              Configure report
            </button>
          </div>
        </>
      )}

      {screen === "configure" && qc && (
        <section>
          <div className="eyebrow">Stage 03 - Report Depth</div>
          <div className="specimen-label">
            <h2 className="text-2xl font-serif">Choose report depth</h2>
          </div>
          <p className="font-serif text-base text-graphite/80 max-w-3xl">
            The literature QC is complete. Choose how much operational detail the generated report should include.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["brief", "standard", "deep"] as Depth[]).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={
                  "border px-4 py-5 text-left " +
                  (depth === d ? "border-brass text-brass bg-sage/20" : "border-rule text-graphite")
                }
              >
                <div className="eyebrow">{DEPTH_LABEL[d]}</div>
                <div className="mt-2 font-serif text-xl text-graphite">
                  {d === "brief" && "Concise protocol and key constraints"}
                  {d === "standard" && "Full operational report"}
                  {d === "deep" && "Expanded assumptions and QC detail"}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-between">
            <button className="ghost" onClick={() => setScreen("qc")}>
              Back to QC
            </button>
            <button
              className="primary"
              onClick={runPlan}
              disabled={planLoading || !question.trim()}
            >
              {planLoading ? "Drafting report..." : "Generate report"}
            </button>
          </div>
        </section>
      )}

      {screen === "report" && plan && planResp && (
        <>
          <div className="mb-6 flex justify-between items-center">
            <button className="ghost" onClick={() => setScreen("configure")}>
              Back to report depth
            </button>
          </div>
          <PlanWorkspace
            plan={plan}
            planId={planResp.plan_id}
            meta={{
              experiment_type: planResp.experiment_type,
              grounding_used: planResp.grounding_used,
              team_examples_applied: planResp.team_examples_applied,
            }}
          />

          <section className="mt-12 mb-20">
            <div className="eyebrow">Export</div>
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
