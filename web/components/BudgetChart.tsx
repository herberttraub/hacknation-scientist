"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Budget, Material } from "@/lib/api";

const CATEGORY_COLOR: Record<string, string> = {
  consumables: "#A8794A",
  equipment: "#9DAE94",
  labor: "#2B2B2B",
  contingency: "#D9CFBE",
  other: "#7A6E5C",
};

function categoryForMaterial(m: Material) {
  const text = `${m.name} ${m.supplier} ${m.catalog_no}`.toLowerCase();
  if (/(reader|detector|instrument|pipette|incubator|centrifuge|oven|freeze|freezer)/.test(text)) return "equipment";
  if (/(service|labor|technician|consult)/.test(text)) return "labor";
  return "consumables";
}

type Props = { budget: Budget; materials: Material[] };

export default function BudgetChart({ budget, materials }: Props) {
  const rows = [...materials]
    .map((m) => ({
      name: m.name,
      supplier: m.supplier,
      category: categoryForMaterial(m),
      total: Math.round(m.total_cost_usd || m.qty * m.unit_cost_usd || 0),
    }))
    .sort((a, b) => b.total - a.total);

  const rowTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);
  const contingency = Math.max(0, Math.round((budget.total_usd || rowTotal) - rowTotal));
  const categoryTotals = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.total;
    return acc;
  }, {});
  if (contingency > 0) categoryTotals.contingency = contingency;

  const cats = Object.entries(categoryTotals)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value, fill: CATEGORY_COLOR[name] || CATEGORY_COLOR.other }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div>
        <div className="eyebrow mb-2">Orderable materials and cost drivers</div>
        <div className="border border-rule bg-ivory/40 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-ivory">
                <th className="text-left px-3 py-2 eyebrow">Item</th>
                <th className="text-left px-3 py-2 eyebrow">Category</th>
                <th className="text-left px-3 py-2 eyebrow">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-rule">
                  <td className="px-3 py-2">
                    <div className="font-serif text-base text-graphite">{r.name}</div>
                    {r.supplier && <div className="text-xs italic text-graphite/60">{r.supplier}</div>}
                  </td>
                  <td className="px-3 py-2 mono text-[11px] text-brass">{r.category}</td>
                  <td className="px-3 py-2 min-w-[260px]">
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 border border-rule bg-ivory">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(4, (r.total / maxTotal) * 100)}%`,
                            background: CATEGORY_COLOR[r.category] || CATEGORY_COLOR.other,
                          }}
                        />
                      </div>
                      <div className="mono text-xs text-graphite w-20 text-right">
                        ${r.total.toLocaleString()}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {contingency > 0 && (
                <tr className="border-t border-rule">
                  <td className="px-3 py-2 font-serif text-base">Contingency reserve</td>
                  <td className="px-3 py-2 mono text-[11px] text-brass">contingency</td>
                  <td className="px-3 py-2 mono text-xs text-right">${contingency.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Category breakdown</div>
        <div className="border border-rule bg-ivory/40 p-3" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                stroke="#F4EFE6"
                strokeWidth={2}
              >
                {cats.map((c) => (
                  <Cell key={c.name} fill={c.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#F4EFE6", border: "1px solid #A8794A", borderRadius: 2, fontFamily: "Inter", fontSize: 12 }}
                formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1">
          {cats.map((c) => (
            <div key={c.name} className="flex items-center gap-2 mono text-[11px]">
              <span className="inline-block w-3 h-3 border border-rule" style={{ background: c.fill }} />
              <span>{c.name}</span>
              <span className="ml-auto">${c.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 mono text-xs text-graphite">
          Total: ${(budget.total_usd || rowTotal + contingency).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  );
}
