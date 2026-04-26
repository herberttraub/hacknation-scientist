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
type Screen = "login" | "signup" | "intake" | "qc" | "configure" | "report";
type Account = { email: string; password: string };

const DEPTH_LABEL: Record<Depth, string> = {
  brief: "Shallow",
  standard: "Regular",
  deep: "Deep",
};

export default function Workspace() {
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [screen, setScreen] = useState<Screen>("login");
  const [userEmail, setUserEmail] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [qc, setQc] = useState<QCResult | null>(null);
  const [planResp, setPlanResp] = useState<PlanResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [qcLoading, setQcLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan: ExperimentPlan | null = planResp?.plan ?? null;
  const promptLength = question.trim().length;
  const promptTooShort = promptLength > 0 && promptLength < 30;

  function readAccounts(): Account[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("husky_lab_accounts") || "[]");
    } catch {
      return [];
    }
  }

  function writeAccounts(accounts: Account[]) {
    window.localStorage.setItem("husky_lab_accounts", JSON.stringify(accounts));
  }

  function signUp() {
    const email = authEmail.trim().toLowerCase();
    if (!email || authPassword.length < 8) {
      setError("Create an account with an email and a password of at least 8 characters.");
      return;
    }
    const accounts = readAccounts();
    if (accounts.some((a) => a.email === email)) {
      setError("That email already has an account. Log in with the existing password.");
      return;
    }
    writeAccounts([...accounts, { email, password: authPassword }]);
    window.localStorage.setItem("husky_lab_session", email);
    setUserEmail(email);
    setError(null);
    setScreen("intake");
  }

  function logIn() {
    const email = authEmail.trim().toLowerCase();
    const account = readAccounts().find((a) => a.email === email);
    if (!account || account.password !== authPassword) {
      setError("No matching account was found for that email and password.");
      return;
    }
    window.localStorage.setItem("husky_lab_session", email);
    setUserEmail(email);
    setError(null);
    setScreen("intake");
  }

  function logOut() {
    window.localStorage.removeItem("husky_lab_session");
    setUserEmail("");
    setAuthPassword("");
    setHistoryOpen(false);
    setScreen("login");
  }

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
    const session = window.localStorage.getItem("husky_lab_session") || "";
    if (session) {
      setUserEmail(session);
      setScreen("intake");
    }
    loadHistory();
  }, []);

  async function runQC() {
    if (promptLength < 30) {
      setError("Please enter at least 30 characters for the hypothesis.");
      return;
    }
    setError(null);
    setQc(null);
    setPlanResp(null);
    setScreen("intake");
    setQcLoading(true);
    try {
      const r = await api.qc(question);
      setQc(r);
      setScreen("qc");
    } catch (e) {
      setError(String(e));
    } finally {
      setQcLoading(false);
    }
  }

  async function runPlan() {
    if (promptLength < 30) return;
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
    if (target === "login" || target === "signup") return !userEmail;
    if (target === "intake") return !!userEmail;
    if (target === "qc") return !!userEmail && !!qc;
    if (target === "configure") return !!userEmail && !!qc;
    if (target === "report") return !!userEmail && !!planResp;
    return false;
  }

  function goTo(target: Screen) {
    if (canVisit(target)) setScreen(target);
  }

  return (
    <main className="min-h-screen px-8 md:px-12 py-10 max-w-[1500px] mx-auto">
      <header className="mb-10">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="eyebrow">Challenge 04 - Fulcrum Science</div>
            <button type="button" onClick={() => userEmail && setScreen("intake")} className="text-left">
              <h1 className="text-5xl mt-1 font-serif">Husky Lab - AI Scientist</h1>
            </button>
          </div>
          <div className="mono text-[11px] text-graphite/60 flex items-center gap-2">
            {userEmail && <span className="hidden md:inline text-graphite/60">{userEmail}</span>}
            <button
              className="ghost"
              onClick={() => {
                setHistoryOpen((v) => !v);
                if (!historyOpen) loadHistory();
              }}
              type="button"
              disabled={!userEmail}
            >
              Recent history
            </button>
            {userEmail && (
              <button className="ghost" type="button" onClick={logOut}>
                Log out
              </button>
            )}
          </div>
        </div>
        {historyOpen && userEmail && (
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

      {userEmail && (
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
      )}

      {error && (
        <div className="mb-6 border border-brass px-4 py-3 bg-ivory/60">
          <div className="eyebrow">Request failed</div>
          <p className="mt-1 font-serif text-sm text-graphite">{error}</p>
        </div>
      )}

      {(screen === "login" || screen === "signup") && (
        <section className="max-w-xl">
          <div className="eyebrow">{screen === "login" ? "Account login" : "Create account"}</div>
          <div className="specimen-label">
            <h2 className="text-2xl font-serif">
              {screen === "login" ? "Sign in to Husky Lab" : "Create a Husky Lab account"}
            </h2>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button className="primary" type="button" onClick={screen === "login" ? logIn : signUp}>
              {screen === "login" ? "Log in" : "Create account"}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setError(null);
                setScreen(screen === "login" ? "signup" : "login");
              }}
            >
              {screen === "login" ? "Create account" : "Back to login"}
            </button>
          </div>
          <p className="mt-3 font-serif italic text-sm text-graphite/70">
            Prototype auth checks local accounts and requires the password used at signup.
          </p>
        </section>
      )}

      {screen === "intake" && userEmail && (
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
          <div className="mt-2 flex justify-between text-xs">
            <span className={promptTooShort ? "text-brass" : "text-graphite/60"}>
              Minimum 30 characters required.
            </span>
            <span className="mono text-graphite/60">{promptLength}/30</span>
          </div>
          {promptTooShort && (
            <p className="margin-note mt-2 text-xs">Add a little more detail before running literature QC.</p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              className="primary"
              onClick={runQC}
              disabled={qcLoading || promptLength < 30}
            >
              {qcLoading ? "Running QC..." : "Run literature QC"}
            </button>
          </div>
        </section>
      )}

      {screen === "qc" && qc && userEmail && (
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

      {screen === "configure" && qc && userEmail && (
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
              disabled={planLoading || promptLength < 30}
            >
              {planLoading ? "Drafting report..." : "Generate report"}
            </button>
          </div>
        </section>
      )}

      {screen === "report" && plan && planResp && userEmail && (
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
            onRegenerate={runPlan}
            regenerating={planLoading}
          />
        </>
      )}
    </main>
  );
}
