"use client";

import type { Equipment } from "@/lib/api";

type Props = { equipment: Equipment[] };

function labHref(e: Equipment) {
  const query = encodeURIComponent([e.location, e.owner_team, e.name, "MIT lab"].filter(Boolean).join(" "));
  return `https://www.google.com/search?q=${query}`;
}

export default function EquipmentRail({ equipment }: Props) {
  if (equipment.length === 0) {
    return <div className="text-sm font-serif italic text-graphite/60">No equipment locations listed.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {equipment.map((e, i) => (
        <div key={i} className="border border-rule p-4 bg-ivory/40">
          <div className="font-serif text-lg text-graphite">{e.name}</div>
          {e.model && <div className="mono text-[11px] text-graphite/70">{e.model}</div>}
          <a
            href={labHref(e)}
            target="_blank"
            rel="noreferrer"
            className="text-xs italic font-serif text-brass mt-1 underline decoration-brass block"
          >
            {e.location}
          </a>
          {e.owner_team && (
            <div className="text-[11px] text-graphite/60 mt-1">owner: {e.owner_team}</div>
          )}
        </div>
      ))}
    </div>
  );
}
