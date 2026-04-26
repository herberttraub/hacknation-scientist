"use client";

import { useState } from "react";
import type { PlanReference, StaffAssignment } from "@/lib/api";

type Author = {
  name: string;
  paperTitle: string;
  paperHref: string;
};

function stripHonorific(name: string): string {
  return name.replace(/^\s*(Dr\.?|Prof\.?|Professor|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "").trim();
}

type Props = {
  staffing: StaffAssignment[];
  references?: PlanReference[];
};

function refHref(r: PlanReference): string {
  if (r.url) return r.url;
  if (r.doi) return `https://doi.org/${r.doi}`;
  return "";
}

function uniqueAuthors(refs: PlanReference[]): Author[] {
  const seen = new Set<string>();
  const out: Author[] = [];
  for (const r of refs) {
    if (!r.authors) continue;
    const href = refHref(r);
    for (const raw of r.authors.split(",")) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name, paperTitle: r.title, paperHref: href });
    }
  }
  return out;
}

export default function PriorWorkRail({ staffing, references = [] }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const authors = uniqueAuthors(references);
  const authorNameSet = new Set(authors.map((a) => a.name.toLowerCase()));
  const otherStaff = staffing.filter(
    (s) => s.named_person && !authorNameSet.has(s.named_person.toLowerCase()),
  );

  function authorEmail(a: Author): string {
    const name = stripHonorific(a.name);
    return `Subject: Question on your paper "${a.paperTitle}"\n\nDear Dr. ${name},\n\nI'm scoping an experiment that builds on your work in "${a.paperTitle}". Would you have 20 minutes this week to advise on the protocol design? I'd particularly appreciate your perspective on the approach and any pitfalls you encountered.\n\nThanks,\nHusky Lab @ MIT`;
  }

  function staffEmail(s: StaffAssignment): string {
    const name = stripHonorific(s.named_person);
    return `Subject: Quick question on ${s.expertise_tags[0] ?? "your work"}\n\nDear Dr. ${name},\n\nI'm scoping an experiment that draws on ${s.expertise_tags.join(", ") || "your area"}. Would you have 20 minutes this week to advise on the protocol design? I'd particularly value your perspective on the ${s.role.toLowerCase()} aspect.\n\nThanks,\nHusky Lab @ MIT`;
  }

  function toggleDraft(key: string, body: string) {
    setDrafts((d) => {
      const next = { ...d };
      if (next[key] != null) delete next[key];
      else next[key] = body;
      return next;
    });
  }

  function updateDraft(key: string, body: string) {
    setDrafts((d) => ({ ...d, [key]: body }));
  }

  const hasAuthors = authors.length > 0;
  const hasOthers = otherStaff.length > 0;

  if (!hasAuthors && !hasOthers) {
    return <div className="text-sm font-serif italic text-graphite/60">No contacts listed.</div>;
  }

  return (
    <div>
      {hasAuthors && (
        <section>
          <div className="eyebrow mb-3">Authors of cited papers</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {authors.map((a) => {
              const key = `author:${a.name}`;
              const open = drafts[key] != null;
              return (
                <div key={key} className="border border-rule p-4 bg-ivory/40">
                  <div className="font-serif text-lg text-graphite">{a.name}</div>
                  <div className="text-xs italic font-serif text-graphite/70 mt-1">
                    Author of:{" "}
                    {a.paperHref ? (
                      <a
                        href={a.paperHref}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-brass text-brass"
                      >
                        {a.paperTitle}
                      </a>
                    ) : (
                      a.paperTitle
                    )}
                  </div>
                  <button
                    className="ghost mt-3 text-[11px] py-0.5 px-2"
                    onClick={() => toggleDraft(key, authorEmail(a))}
                  >
                    {open ? "close draft" : "draft outreach email"}
                  </button>
                  {open && (
                    <textarea
                      className="mt-3 text-[11px] font-serif italic bg-ivory border border-rule text-graphite/80 w-full p-3"
                      rows={9}
                      value={drafts[key]}
                      onChange={(e) => updateDraft(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasAuthors && hasOthers && <div className="my-6 brass-rule" />}

      {hasOthers && (
        <section>
          <div className="eyebrow mb-3">Other helpful people</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherStaff.map((s) => {
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
                      onChange={(e) => updateDraft(key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
