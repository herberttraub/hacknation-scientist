"use client";

import type { Equipment } from "@/lib/api";

type Props = { equipment: Equipment[] };

export default function EquipmentRail({ equipment }: Props) {
  if (equipment.length === 0) return null;
  return (
    <aside className="border border-rule p-4 bg-ivory/40">
      <div className="eyebrow mb-2">Where to find equipment</div>
      <div className="brass-rule mb-3" />
      <ul className="space-y-3">
        {equipment.map((e, i) => (
          <li key={i} className="text-sm">
            <div className="font-serif text-base text-graphite">{e.name}</div>
            {e.model && <div className="mono text-[11px] text-graphite/70">{e.model}</div>}
            <div className="text-xs italic font-serif text-brass mt-0.5">{e.location}</div>
            {e.owner_team && (
              <div className="text-[11px] text-graphite/60 mt-0.5">owner · {e.owner_team}</div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
