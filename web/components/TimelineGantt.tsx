"use client";

import type { Phase } from "@/lib/api";

type Props = { timeline: Phase[] };

// Hand-rolled SVG Gantt — phases as horizontal sage bars, weekly brass rules,
// parallel phases stack onto separate rows.
export default function TimelineGantt({ timeline }: Props) {
  if (timeline.length === 0) {
    return <div className="text-sm font-serif italic text-graphite/60">No timeline data.</div>;
  }

  const maxWeek = Math.max(...timeline.map((p) => p.week_end));
  const W = 900;
  const ROW_H = 40;
  const TOP = 30;
  const LEFT_GUTTER = 240;
  const RIGHT_PAD = 16;
  const trackW = W - LEFT_GUTTER - RIGHT_PAD;
  const weekW = trackW / Math.max(1, maxWeek);

  // One row per phase — keeps labels legible. Parallelism is signaled by
  // bar overlap in time (week_start of phase B < week_end of phase A).
  const rowOf = new Map<number, number>();
  timeline.forEach((_, i) => rowOf.set(i, i));
  const rows = timeline.length;
  const H = TOP + rows * ROW_H + 30;

  return (
    <div className="border border-rule bg-ivory/40 p-3 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none">
        {/* week rules */}
        {Array.from({ length: maxWeek + 1 }).map((_, w) => (
          <g key={w}>
            <line
              x1={LEFT_GUTTER + w * weekW}
              x2={LEFT_GUTTER + w * weekW}
              y1={TOP - 10}
              y2={H - 18}
              stroke={w % 2 === 0 ? "#D9CFBE" : "#E8E0D0"}
              strokeWidth={1}
            />
            {w > 0 && (
              <text
                x={LEFT_GUTTER + w * weekW - 2}
                y={TOP - 14}
                fontSize="10"
                fontFamily="Inter"
                fill="#A8794A"
                textAnchor="end"
              >
                w{w}
              </text>
            )}
          </g>
        ))}

        {/* phase bars */}
        {timeline.map((p, i) => {
          const row = rowOf.get(i) ?? 0;
          const y = TOP + row * ROW_H;
          const x = LEFT_GUTTER + (p.week_start - 1) * weekW;
          const w = (p.week_end - p.week_start + 1) * weekW;
          return (
            <g key={i}>
              {/* label gutter */}
              <text
                x={LEFT_GUTTER - 8}
                y={y + ROW_H / 2 + 4}
                fontSize="12"
                fontFamily="EB Garamond, serif"
                fontStyle="italic"
                fill="#2B2B2B"
                textAnchor="end"
              >
                {p.name.length > 32 ? p.name.slice(0, 30) + "…" : p.name}
              </text>
              {/* bar */}
              <rect
                x={x}
                y={y + 6}
                width={Math.max(2, w - 4)}
                height={ROW_H - 16}
                fill="#9DAE94"
                stroke="#7A8C71"
                strokeWidth={1}
              />
              {/* dependency tick */}
              {p.dependencies.length > 0 && (
                <circle cx={x + 2} cy={y + ROW_H / 2} r={3} fill="#A8794A" />
              )}
              {/* week range label */}
              <text
                x={x + 6}
                y={y + ROW_H / 2 + 4}
                fontSize="10"
                fontFamily="JetBrains Mono"
                fill="#2B2B2B"
              >
                w{p.week_start}–{p.week_end}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
