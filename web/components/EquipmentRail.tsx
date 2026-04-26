"use client";

import type { Equipment } from "@/lib/api";

type Props = { equipment: Equipment[] };

function mapsLinkHref(location: string) {
  const query = encodeURIComponent(`${location}, Cambridge, MA`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function mapsEmbedHref(location: string) {
  const query = encodeURIComponent(`${location}, Cambridge, MA`);
  return `https://maps.google.com/maps?q=${query}&z=15&output=embed`;
}

type LocationGroup = {
  location: string;
  owners: string[];
  items: Equipment[];
};

function groupByLocation(equipment: Equipment[]): LocationGroup[] {
  const map = new Map<string, LocationGroup>();
  for (const e of equipment) {
    const key = e.location || "(location not specified)";
    let group = map.get(key);
    if (!group) {
      group = { location: key, owners: [], items: [] };
      map.set(key, group);
    }
    group.items.push(e);
    if (e.owner_team && !group.owners.includes(e.owner_team)) {
      group.owners.push(e.owner_team);
    }
  }
  return Array.from(map.values());
}

export default function EquipmentRail({ equipment }: Props) {
  if (equipment.length === 0) {
    return <div className="text-sm font-serif italic text-graphite/60">No equipment locations listed.</div>;
  }

  const groups = groupByLocation(equipment);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map((g) => (
        <div key={g.location} className="border border-rule p-4 bg-ivory/40">
          <a
            href={mapsLinkHref(g.location)}
            target="_blank"
            rel="noreferrer"
            className="font-serif text-base text-graphite underline decoration-brass"
          >
            {g.location}
          </a>
          {g.owners.length > 0 && (
            <div className="text-[11px] text-graphite/60 mt-1">
              owner{g.owners.length === 1 ? "" : "s"}: {g.owners.join(", ")}
            </div>
          )}
          <ul className="mt-3 space-y-1.5">
            {g.items.map((e, i) => (
              <li key={`${e.name}-${i}`} className="text-sm">
                <span className="font-serif text-graphite">{e.name}</span>
                {e.model && (
                  <span className="mono text-[11px] text-graphite/60 ml-2">{e.model}</span>
                )}
              </li>
            ))}
          </ul>
          <iframe
            src={mapsEmbedHref(g.location)}
            loading="lazy"
            className="w-full h-32 border border-rule mt-3"
            title={`Map for ${g.location}`}
          />
        </div>
      ))}
    </div>
  );
}
