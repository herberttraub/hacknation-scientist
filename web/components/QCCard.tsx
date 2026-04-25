"use client";

import { useState } from "react";
import { api, type QCResult } from "@/lib/api";
import NoveltyMeter from "./NoveltyMeter";

type Props = {
  result: QCResult;
  question: string;
  onUpdate: (next: QCResult) => void;
};

export default function QCCard({ result, question, onUpdate }: Props) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);

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
        <NoveltyMeter status={result.status} novelty={result.novelty_score} />

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
                      {r.source_id.startsWith("http") ? (
                        <a href={r.source_id} target="_blank" rel="noreferrer" className="underline decoration-brass">
                          {r.source_id}
                        </a>
                      ) : (
                        r.source_id
                      )}
                      <span className="ml-3 text-graphite/50">
                        sim {r.similarity.toFixed(2)}
                      </span>
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
