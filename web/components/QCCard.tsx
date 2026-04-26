"use client";

import { useState } from "react";
import { api, type QCResult } from "@/lib/api";

type Props = {
  result: QCResult;
  question: string;
  onUpdate: (next: QCResult) => void;
};

const VERDICTS = [
  { status: "not_found", label: "Not Found" },
  { status: "similar_work_exists", label: "Similar Work Exists" },
  { status: "exact_match_found", label: "Exact Match Found" },
] as const;

function refHref(sourceId: string, url: string) {
  if (url) return url;
  if (sourceId.startsWith("http")) return sourceId;
  if (sourceId.startsWith("10.")) return `https://doi.org/${sourceId}`;
  return `https://www.semanticscholar.org/search?q=${encodeURIComponent(sourceId)}`;
}

export default function QCCard({ result, question, onUpdate }: Props) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const displayStatus =
    result.status === "no_indexed_knowledge" || result.status === "ungrounded"
      ? "not_found"
      : result.status;

  async function provideSource() {
    if (!sourceUrl.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("question", question);
      fd.append("source_url", sourceUrl);
      const r = await api.qcWithSource(fd);
      onUpdate(r);
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function broad() {
    setBusy(true);
    try {
      const r = await api.qcBroad(question);
      onUpdate(r);
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="eyebrow">Stage 02 · Literature QC</div>
      <div className="specimen-label">
        <h2 className="text-2xl font-serif">Has this been done before?</h2>
      </div>

      {result.is_ungrounded && (
        <div
          className="mb-4 px-4 py-3 text-sm font-serif italic"
          style={{ background: "#9DAE94", color: "#2B2B2B" }}
        >
          Broad search · not literature-backed. Every claim below is from general
          model knowledge only and is marked <span className="mono">[ungrounded]</span>.
        </div>
      )}

      <div className="border border-rule p-6 bg-ivory/40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {VERDICTS.map((v) => {
            const active = displayStatus === v.status;
            return (
              <div
                key={v.status}
                className={
                  "border px-4 py-5 text-center " +
                  (active ? "border-brass bg-sage/30" : "border-rule bg-ivory/30")
                }
              >
                <div className="eyebrow">Novelty Signal</div>
                <div className="mt-2 font-serif text-2xl text-graphite">
                  {v.label}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-6 font-serif text-base text-graphite leading-relaxed">
          {result.rationale}
        </p>

        {result.needs_user_choice && (
          <div className="mt-6 border-t border-rule pt-4">
            <p className="text-sm font-serif italic text-graphite/80">
              We don&rsquo;t have indexed literature on this question. Two ways forward:
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Paste a paper URL or DOI to search against"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="flex-1"
                />
                <button className="ghost" onClick={provideSource} disabled={busy || !sourceUrl}>
                  Use this source
                </button>
              </div>
              <button className="ghost self-start" onClick={broad} disabled={busy}>
                {busy ? "Working…" : "Run a broad search anyway"}
              </button>
            </div>
          </div>
        )}

        {result.references.length > 0 && (
          <div className="mt-6 border-t border-rule pt-4">
            <div className="eyebrow mb-2">References</div>
            <ol className="space-y-3">
              {result.references.map((r, i) => (
                <li key={i} className="text-sm">
                  <div className="font-serif text-base text-graphite">
                    {r.title}
                  </div>
                  <div className="text-graphite/70 italic">
                    {r.authors}{r.year ? ` · ${r.year}` : ""}
                  </div>
                  {r.source_id && (
                    <div className="mono text-xs text-brass">
                      <a
                        href={refHref(r.source_id, r.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-brass"
                      >
                        {r.source_id}
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
