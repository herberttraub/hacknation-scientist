"use client";

import type { Material } from "@/lib/api";

type Props = { materials: Material[] };

const PRIO_COLOR: Record<Material["order_priority"], string> = {
  early: "#9DAE94",
  middle: "#D9CFBE",
  late: "#A8794A",
};

export default function MaterialsTable({ materials }: Props) {
  if (materials.length === 0)
    return <div className="text-sm font-serif italic text-graphite/60">No materials listed.</div>;

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
            <th className="text-center px-3 py-2 eyebrow">Order</th>
            <th className="text-left px-3 py-2 eyebrow">Storage / shelf</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => (
            <tr key={i} className="border-t border-rule">
              <td className="px-3 py-2 font-serif">{m.name}</td>
              <td className="px-3 py-2 mono text-xs text-graphite/80">{m.catalog_no || "—"}</td>
              <td className="px-3 py-2 text-xs">
                {m.supplier_url ? (
                  <a href={m.supplier_url} target="_blank" rel="noreferrer" className="underline decoration-brass">
                    {m.supplier || "(link)"}
                  </a>
                ) : (
                  m.supplier || "—"
                )}
              </td>
              <td className="px-3 py-2 mono text-xs text-right">
                {m.qty}
                {m.unit_size ? ` × ${m.unit_size}` : ""}
              </td>
              <td className="px-3 py-2 mono text-xs text-right">
                {m.unit_cost_usd ? `$${m.unit_cost_usd.toFixed(2)}` : "—"}
              </td>
              <td className="px-3 py-2 mono text-xs text-right text-graphite">
                {m.total_cost_usd ? `$${m.total_cost_usd.toFixed(2)}` : "—"}
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className="inline-block px-2 py-0.5 mono text-[10px] uppercase"
                  style={{ background: PRIO_COLOR[m.order_priority], color: "#2B2B2B" }}
                >
                  {m.order_priority}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-graphite/80 italic font-serif">
                {m.storage || "—"}
                {m.shelf_life_days ? (
                  <span className="ml-2 mono text-[11px] text-brass">{m.shelf_life_days}d</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
