"use client";

import { useState } from "react";
import type { StaffAssignment } from "@/lib/api";

type Props = { staffing: StaffAssignment[] };

export default function PriorWorkRail({ staffing }: Props) {
  const [drafting, setDrafting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const named = staffing.filter((s) => s.named_person);

  async function draftEmail(s: StaffAssignment) {
    setDrafting(s.named_person);
    try {
      const lastName = s.named_person.split(" ").slice(-1)[0] || s.named_person;
      const text = `Subject: Quick question on ${s.expertise_tags[0] ?? "your work"}\n\nDear ${lastName},\n\nI'm scoping an experiment that draws on ${s.expertise_tags.join(", ") || "your area"}. Would you have 20 minutes this week to advise on the protocol design? I'd particularly value your perspective on the ${s.role.toLowerCase()} aspect.\n\nThanks,\nHusky Lab @ MIT`;
      setDrafts((d) => ({ ...d, [s.named_person]: text }));
    } finally {
      setDrafting(null);
    }
  }

  if (named.length === 0) {
    return <div className="text-sm font-serif italic text-graphite/60">No prior-work contacts listed.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {named.map((s, i) => (
        <div key={i} className="border border-rule p-4 bg-ivory/40">
          <div className="font-serif text-lg text-graphite">{s.named_person}</div>
          <div className="text-xs italic font-serif text-graphite/70">{s.institution}</div>
          <div className="mono text-[11px] text-brass mt-1">{s.role}</div>
          {s.expertise_tags.length > 0 && (
            <div className="mt-2 text-xs text-graphite/80">
              {s.expertise_tags.slice(0, 4).join(" - ")}
            </div>
          )}
          <button
            className="ghost mt-3 text-[11px] py-0.5 px-2"
            onClick={() => draftEmail(s)}
            disabled={drafting === s.named_person}
          >
            {drafting === s.named_person ? "drafting..." : "draft outreach email"}
          </button>
          {drafts[s.named_person] && (
            <pre className="mt-3 p-3 text-[11px] font-serif italic whitespace-pre-wrap bg-ivory border border-rule text-graphite/80">
              {drafts[s.named_person]}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
