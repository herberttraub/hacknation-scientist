"use client";

import type { Material, Phase, ProtocolStep } from "@/lib/api";

type Props = {
  materials: Material[];
  protocol?: ProtocolStep[];
  timeline?: Phase[];
  focusMaterial?: string | null;
};

const FALLBACK_LEAD_DAYS: Record<Material["order_priority"], number> = {
  early: 21,
  middle: 10,
  late: 3,
};

function supplierSearchHref(m: Material) {
  const query = encodeURIComponent([m.supplier, m.catalog_no, m.name].filter(Boolean).join(" "));
  return `https://www.google.com/search?q=${query}`;
}

function firstUse(material: Material, protocol: ProtocolStep[] = []) {
  const name = material.name.toLowerCase();
  const catalog = material.catalog_no.toLowerCase();
  const foundIndex = protocol.findIndex((step) =>
    step.materials_used.some((used) => {
      const u = used.toLowerCase();
      return u.includes(name) || name.includes(u) || (!!catalog && u.includes(catalog));
    })
  );
  if (foundIndex < 0) return null;
  return { stepNumber: foundIndex + 1, step: protocol[foundIndex] };
}

function phaseForStep(stepNumber: number, protocol: ProtocolStep[] = [], timeline: Phase[] = []) {
  if (!protocol.length || !timeline.length) return null;
  const phaseIndex = Math.min(
    timeline.length - 1,
    Math.floor(((stepNumber - 1) / protocol.length) * timeline.length)
  );
  return timeline[phaseIndex] ?? null;
}

export default function MaterialsTable({ materials, protocol = [], timeline = [], focusMaterial = null }: Props) {
  if (materials.length === 0) {
    return <div className="text-sm font-serif italic text-graphite/60">No materials listed.</div>;
  }

  return (
    <div className="border border-rule overflow-x-auto bg-ivory/40">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-ivory">
            <th className="text-left px-3 py-2 eyebrow">Reagent</th>
            <th className="text-left px-3 py-2 eyebrow">Catalog #</th>
            <th className="text-left px-3 py-2 eyebrow">Supplier</th>
            <th className="text-right px-3 py-2 eyebrow">Qty</th>
            <th className="text-right px-3 py-2 eyebrow">Unit $</th>
            <th className="text-right px-3 py-2 eyebrow">Total</th>
            <th className="text-left px-3 py-2 eyebrow">Order lead</th>
            <th className="text-left px-3 py-2 eyebrow">First use</th>
            <th className="text-left px-3 py-2 eyebrow">Storage / shelf life</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => {
            const use = firstUse(m, protocol);
            const phase = use ? phaseForStep(use.stepNumber, protocol, timeline) : null;
            const leadDays = m.lead_time_days ?? FALLBACK_LEAD_DAYS[m.order_priority];
            const focused = !!focusMaterial && m.name.toLowerCase().includes(focusMaterial.toLowerCase());
            return (
              <tr key={i} className={"border-t border-rule " + (focused ? "bg-sage/20" : "")}>
                <td className="px-3 py-2 font-serif">{m.name}</td>
                <td className="px-3 py-2 mono text-xs text-graphite/80">{m.catalog_no || "-"}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-serif text-graphite">{m.supplier || "Supplier search"}</div>
                  <a
                    href={supplierSearchHref(m)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-1 mono text-[10px] text-brass border border-rule px-1.5 py-0.5 hover:border-brass"
                    title="Search supplier and catalog number"
                  >
                    find
                  </a>
                </td>
                <td className="px-3 py-2 mono text-xs text-right">
                  {m.qty}
                  {m.unit_size ? ` x ${m.unit_size}` : ""}
                </td>
                <td className="px-3 py-2 mono text-xs text-right">
                  {m.unit_cost_usd ? `$${m.unit_cost_usd.toFixed(2)}` : "-"}
                </td>
                <td className="px-3 py-2 mono text-xs text-right text-graphite">
                  {m.total_cost_usd ? `$${m.total_cost_usd.toFixed(2)}` : "-"}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="mono text-[11px] text-brass">{leadDays} days before use</div>
                  {m.lead_time_days == null && (
                    <div className="font-serif italic text-graphite/60">
                      fallback from {m.order_priority} priority
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs min-w-[220px]">
                  {use ? (
                    <>
                      <div className="mono text-[11px] text-brass">Step {use.stepNumber}</div>
                      <div className="font-serif text-graphite">{use.step.name}</div>
                      {phase && (
                        <div className="font-serif italic text-graphite/60">
                          timeline: {phase.name} (w{phase.week_start}-w{phase.week_end})
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="font-serif italic text-graphite/60">not mapped to a protocol step</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-graphite/80 italic font-serif">
                  {m.storage || "-"}
                  {m.shelf_life_days ? (
                    <span className="ml-2 mono text-[11px] text-brass">{m.shelf_life_days}d shelf life</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
