"use client";

import { useState } from "react";
import type { StaffAssignment } from "@/lib/api";

type Props = { staffing: StaffAssignment[] };

export default function PriorWorkRail({ staffing }: Props) {
  const [drafting, setDrafting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function draftEmail(s: StaffAssignment) {
    setDrafting(s.named_person);
    try {
      const text = `Subject: Quick question on ${s.expertise_tags[0] ?? "your work"}\n\nDear ${s.named_person.split(" ").slice(-1)[0] || s.named_person},\n\nI'm scoping an experiment that draws on ${s.expertise_tags.join(", ") || "your area"}. Would you have 20 minutes this week to advise on the protocol design? I'd particularly value your perspective on the ${s.role.toLowerCase()} aspect.\n\nThanks,\nHusky Lab @ MIT`;
      setDrafts((d) => ({ ...d, [s.named_person]: text }));
    } finally {
      setDrafting(null);
    }
  }

  if (staffing.length === 0) return null;

  return (
    <aside className="border border-rule p-4 bg-ivory/40">
      <div className="eyebrow mb-2">Prior Work By</div>
      <div className="brass-rule mb-3" />
      <ul className="space-y-3">
        {staffing.filter((s) => s.named_person).map((s, i) => (
          <li key={i} className="text-sm">
            <div className="font-serif text-base text-graphite">{s.named_person}</div>
            <div className="text-xs italic font-serif text-graphite/70">{s.institution}</div>
            <div className="mono text-[11px] text-brass mt-0.5">{s.role} · {s.fte_pct}% FTE</div>
            {s.expertise_tags.length > 0 && (
              <div className="mt-1 text-xs text-graphite/80">
                {s.expertise_tags.slice(0, 3).join(" · ")}
              </div>
            )}
            <button
              className="ghost mt-2 text-[11px] py-0.5 px-2"
              onClick={() => draftEmail(s)}
              disabled={drafting === s.named_person}
            >
              {drafting === s.named_person ? "drafting…" : "draft outreach email"}
            </button>
            {drafts[s.named_person] && (
              <pre className="mt-2 p-2 text-[11px] font-serif italic whitespace-pre-wrap bg-ivory border border-rule text-graphite/80">
                {drafts[s.named_person]}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
