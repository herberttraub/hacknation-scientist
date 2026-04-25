"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Props = {
  planId: string | null;
  onApplied: () => void;
};

const SECTIONS = [
  { value: "novelty_summary", label: "Novelty summary" },
  { value: "environmental_conditions", label: "Environmental conditions" },
  { value: "protocol", label: "Protocol" },
  { value: "materials", label: "Materials" },
  { value: "budget", label: "Budget" },
  { value: "timeline", label: "Timeline" },
  { value: "staffing", label: "Staffing" },
  { value: "validation", label: "Validation" },
];

export default function FeedbackPanel({ planId, onApplied }: Props) {
  const [section, setSection] = useState("protocol");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ accepted: boolean; reason?: string } | null>(null);

  async function send() {
    if (!planId || !note.trim()) return;
    setBusy(true);
    setLast(null);
    try {
      const r = await api.feedback({
        plan_id: planId,
        section,
        freeform_note: note,
      });
      setLast({ accepted: r.accepted, reason: r.reason });
      if (r.accepted) {
        setNote("");
        onApplied();
      }
    } catch (e) {
      setLast({ accepted: false, reason: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <div className="eyebrow">Stage 04 · Scientist Review</div>
      <div className="specimen-label">
        <h2 className="text-2xl font-serif">Feedback &amp; corrections</h2>
      </div>
      <p className="font-serif italic text-sm text-graphite/70 max-w-2xl">
        Corrections train this team&rsquo;s few-shot store. Future plans for similar
        experiment types will reflect them automatically.
      </p>

      <div className="mt-4 border border-rule p-4 bg-ivory/40 max-w-3xl">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 items-baseline">
            <label className="eyebrow">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="border border-rule bg-transparent px-2 py-1 text-sm font-serif"
            >
              {SECTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="What should change? E.g., 'Use serum, not whole blood, for the ELISA comparator. Also tighten the read-out window from 10 minutes to 8 minutes.'"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
          <div className="flex gap-3 items-center">
            <button className="primary" onClick={send} disabled={busy || !note.trim() || !planId}>
              {busy ? "Reviewing…" : "Apply correction"}
            </button>
            {last && !last.accepted && last.reason && (
              <div className="margin-note text-xs">
                rejected: {last.reason}
              </div>
            )}
            {last && last.accepted && (
              <div className="text-xs italic font-serif text-sage">
                applied · re-running for similar future plans will reflect this.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
