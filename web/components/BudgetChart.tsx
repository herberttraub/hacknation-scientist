"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Budget, Material } from "@/lib/api";

const PALETTE = ["#A8794A", "#9DAE94", "#2B2B2B", "#D9CFBE", "#7A6E5C"];

type Props = { budget: Budget; materials: Material[] };

export default function BudgetChart({ budget, materials }: Props) {
  const top = [...materials]
    .map((m) => ({
      name: m.name.length > 28 ? m.name.slice(0, 26) + "…" : m.name,
      total: Math.round(m.total_cost_usd),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  const cats = budget.categories
    .filter((c) => c.total_usd > 0)
    .map((c, i) => ({ name: c.name, value: Math.round(c.total_usd), fill: PALETTE[i % PALETTE.length] }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <div className="eyebrow mb-2">Top Cost Drivers</div>
        <div className="border border-rule bg-ivory/40 p-3" style={{ height: 260 }}>
          {top.length === 0 ? (
            <div className="text-sm font-serif italic text-graphite/60 p-4">
              No cost data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <XAxis type="number" tick={{ fill: "#2B2B2B", fontSize: 11, fontFamily: "Inter" }} stroke="#D9CFBE" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={170}
                  tick={{ fill: "#2B2B2B", fontSize: 11, fontFamily: "Inter" }}
                  stroke="#D9CFBE"
                />
                <Tooltip
                  cursor={{ fill: "#D9CFBE", opacity: 0.4 }}
                  contentStyle={{ background: "#F4EFE6", border: "1px solid #A8794A", borderRadius: 2, fontFamily: "Inter", fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "cost"]}
                />
                <Bar dataKey="total" fill="#A8794A" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Category Breakdown</div>
        <div className="border border-rule bg-ivory/40 p-3" style={{ height: 260 }}>
          {cats.length === 0 ? (
            <div className="text-sm font-serif italic text-graphite/60 p-4">No category split.</div>
          ) : (
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
                  {cats.map((c, i) => (
                    <Cell key={i} fill={c.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#F4EFE6", border: "1px solid #A8794A", borderRadius: 2, fontFamily: "Inter", fontSize: 12 }}
                  formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 mono text-xs text-graphite">
          Total: ${budget.total_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
          <span className="text-graphite/60">· {budget.contingency_pct.toFixed(0)}% contingency</span>
        </div>
      </div>
    </div>
  );
}
