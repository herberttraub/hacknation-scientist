"use client";

import type { QCStatus } from "@/lib/api";

type Props = { status: QCStatus; novelty: number };

const LABELS: Record<Exclude<QCStatus, "ungrounded">, string> = {
  not_found: "Not Found",
  similar_work_exists: "Similar Work Exists",
  exact_match_found: "Exact Match",
  no_indexed_knowledge: "No Indexed Literature",
};

// novelty: 1 = totally novel (left), 0 = exact match (right)
export default function NoveltyMeter({ status, novelty }: Props) {
  const x = Math.max(8, Math.min(92, (1 - novelty) * 100));
  const W = 600;
  const H = 60;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" className="block">
        {/* base rule */}
        <line x1="20" y1={H / 2} x2={W - 20} y2={H / 2} stroke="#D9CFBE" strokeWidth="1" />
        {/* tick marks */}
        {[0, 0.5, 1].map((p) => (
          <line
            key={p}
            x1={20 + p * (W - 40)}
            x2={20 + p * (W - 40)}
            y1={H / 2 - 6}
            y2={H / 2 + 6}
            stroke="#A8794A"
            strokeWidth="1"
          />
        ))}
        {/* labels */}
        <text x="20" y={H / 2 + 24} fontSize="11" fontFamily="Inter" fill="#2B2B2B" textAnchor="start">
          NOT FOUND
        </text>
        <text x={W / 2} y={H / 2 + 24} fontSize="11" fontFamily="Inter" fill="#2B2B2B" textAnchor="middle">
          SIMILAR WORK
        </text>
        <text x={W - 20} y={H / 2 + 24} fontSize="11" fontFamily="Inter" fill="#2B2B2B" textAnchor="end">
          EXACT MATCH
        </text>
        {/* needle */}
        <g transform={`translate(${20 + (x / 100) * (W - 40)}, ${H / 2})`}>
          <polygon points="0,-18 -7,-2 7,-2" fill="#A8794A" />
          <circle cx="0" cy="0" r="3" fill="#A8794A" />
        </g>
      </svg>
      <div className="mt-2 flex items-baseline justify-between text-xs">
        <span className="eyebrow">Novelty Verdict</span>
        <span className="font-serif italic text-graphite">
          {LABELS[(status as Exclude<QCStatus, "ungrounded">)] ?? status}
          <span className="mono ml-3 text-graphite/60">
            score {novelty.toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
