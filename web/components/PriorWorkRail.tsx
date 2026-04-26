"use client";

import { useState } from "react";
import type { PlanReference, StaffAssignment } from "@/lib/api";

type Props = {
  staffing: StaffAssignment[];
  references?: PlanReference[];
};

function stripHonorific(name: string): string {
  return name.replace(/^\s*(Dr\.?|Prof\.?|Professor|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "").trim();
}

function usefulStaff(staffing: StaffAssignment[]) {
  return staffing.filter((s) => {
    const name = (s.named_person || "").trim();
    return name && /\s/.test(stripHonorific(name)) && !/^[a-z0-9_.-]+$/i.test(name);
  });
}

export default function PriorWorkRail({ staffing, references = [] }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const people = usefulStaff(staffing);

  function staffEmail(s: StaffAssignment): string {
    const name = stripHonorific(s.named_person);
    const papers = references
      .filter((r) => r.title)
      .slice(0, 2)
      .map((r) => `"${r.title}"`)
      .join(" and ");
    const context = papers
      ? `The plan is grounded in ${papers}, and I am trying to de-risk the protocol before execution.`
      : "I am trying to de-risk the protocol before execution.";
    return `Subject: Quick protocol advice on ${s.expertise_tags[0] ?? s.role}\n\nDear Dr. ${name},\n\nI'm scoping an experiment that needs ${s.expertise_tags.join(", ") || s.role.toLowerCase()} expertise. ${context}\n\nWould you have 20 minutes this week to advise on the design, likely failure modes, and what to validate first?\n\nThanks,\nHusky Lab @ MIT`;
  }

  function toggleDraft(key: string, body: string) {
    setDrafts((d) => {
      const next = { ...d };
      if (next[key] != null) delete next[key];
      else next[key] = body;
      return next;
    });
  }

  if (people.length === 0) {
    return (
      <div className="border border-rule bg-ivory/40 p-4 max-w-3xl">
        <div className="eyebrow">No named collaborators found</div>
        <p className="mt-2 font-serif text-sm italic text-graphite/70">
          The generated report did not include fixture-backed people. Regenerate after saving feedback so the planner can select named collaborators from the people fixture.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {people.map((s) => {
        const key = `staff:${s.named_person}`;
        const open = drafts[key] != null;
        return (
          <div key={key} className="border border-rule p-4 bg-ivory/40">
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
              onClick={() => toggleDraft(key, staffEmail(s))}
            >
              {open ? "close draft" : "draft outreach email"}
            </button>
            {open && (
              <textarea
                className="mt-3 text-[11px] font-serif italic bg-ivory border border-rule text-graphite/80 w-full p-3"
                rows={9}
                value={drafts[key]}
                onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
