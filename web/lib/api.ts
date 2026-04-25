const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8765";

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function form<T>(path: string, fd: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────
export type QCStatus =
  | "not_found"
  | "similar_work_exists"
  | "exact_match_found"
  | "no_indexed_knowledge"
  | "ungrounded";

export interface Reference {
  title: string;
  authors: string;
  year: number | null;
  source: string;
  source_id: string;
  url: string;
  similarity: number;
  snippet: string;
}

export interface QCResult {
  status: QCStatus;
  novelty_score: number;
  rationale: string;
  references: Reference[];
  needs_user_choice: boolean;
  fallback_options: string[];
  is_ungrounded: boolean;
}

export interface ProtocolStep {
  id: string;
  name: string;
  duration_minutes: number;
  rationale: string;
  materials_used: string[];
  equipment_used: string[];
  qc_checks: string[];
  assumed_skills: string[];
  can_run_parallel_with: string[];
  notes: string;
}

export interface Material {
  name: string;
  catalog_no: string;
  supplier: string;
  supplier_url: string;
  unit_size: string;
  qty: number;
  unit_cost_usd: number;
  total_cost_usd: number;
  lead_time_days: number | null;
  shelf_life_days: number | null;
  storage: string;
  order_priority: "early" | "middle" | "late";
}

export interface Equipment {
  name: string;
  model: string;
  location: string;
  owner_team: string;
}

export interface EnvironmentalConditions {
  temp_min_C: number;
  temp_max_C: number;
  humidity_min_pct: number | null;
  humidity_max_pct: number | null;
  light: string;
  atmosphere: string;
  season_sensitivity: string;
}

export interface BudgetCategory {
  name: "consumables" | "equipment" | "labor" | "contingency" | "other";
  total_usd: number;
}

export interface Budget {
  line_items: Material[];
  categories: BudgetCategory[];
  total_usd: number;
  currency: string;
  contingency_pct: number;
}

export interface Phase {
  name: string;
  week_start: number;
  week_end: number;
  deliverables: string[];
  dependencies: string[];
  parallel_with: string[];
}

export interface StaffAssignment {
  role: string;
  fte_pct: number;
  named_person: string;
  institution: string;
  expertise_tags: string[];
}

export interface ValidationPlan {
  success_criteria: string[];
  failure_modes: string[];
  statistics_plan: string;
}

export interface PlanReference {
  title: string;
  authors: string;
  year: number | null;
  doi: string;
  url: string;
  relevance: string;
}

export interface ExperimentPlan {
  title: string;
  hypothesis: string;
  novelty_summary: string;
  scale_hint: "small" | "medium" | "large";
  environmental_conditions: EnvironmentalConditions;
  protocol: ProtocolStep[];
  materials: Material[];
  equipment: Equipment[];
  budget: Budget;
  timeline: Phase[];
  staffing: StaffAssignment[];
  validation: ValidationPlan;
  references: PlanReference[];
  open_questions: string[];
  budget_justification: string;
}

export interface PlanResponse {
  plan_id: string;
  query_id: string;
  plan: ExperimentPlan;
  experiment_type: string;
  domain: string | null;
  grounding_used: number;
  team_examples_applied: number;
}

// ─── Endpoints ────────────────────────────────────────────────────────────
export const api = {
  health: () => jget<{ status: string; provider: string; demo_mode: string }>("/health"),
  qc: (question: string, team_id?: string) =>
    jpost<QCResult>("/qc", { question, team_id }),
  qcWithSource: (fd: FormData) => form<QCResult>("/qc/with-source", fd),
  qcBroad: (question: string) => jpost<QCResult>("/qc/broad", { question }),
  plan: (body: {
    question: string;
    depth: "brief" | "standard" | "deep";
    team_id?: string;
    qc_status?: string;
    qc_rationale?: string;
    qc_references?: unknown[];
  }) => jpost<PlanResponse>("/plan", body),
  feedback: (body: {
    plan_id: string;
    team_id?: string;
    section: string;
    before?: string;
    after?: string;
    freeform_note?: string;
  }) => jpost<{ ok: boolean; accepted: boolean; reason?: string }>("/feedback", body),
  refine: (body: {
    plan_id: string;
    section: string;
    instruction: "more_detail" | "less_detail" | "freeform";
    freeform_note?: string;
  }) => jpost<{ section: string; updated_text?: string; updated_section?: unknown }>("/refine", body),
  exportPlan: (planId: string, format: "pdf" | "docx" | "tex" | "md") =>
    `${BASE}/plan/${planId}/export?format=${format}`,
};
