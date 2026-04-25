# AI Scientist — 6-Hour Build Plan

**Project:** Husky Lab @ MIT — entry for Fulcrum Science's "AI Scientist" challenge (Hacknation, MIT).
**Goal:** A scientist types a hypothesis → we tell them if it's been done before → we generate a runnable, operationally grounded experiment plan → they edit/refine it inline → they export it as PDF / DOCX / LaTeX. The system learns from their corrections per-team.
**Constraints:** 6 hours, solo build, local-first, structured for trivial Vercel deploy later.
**Judge profile:** Fulcrum Science (https://fulcrum.science/fellowship/) — they care about *operational realism*, not novelty for novelty's sake.

---

## 1. Locked stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + Tiptap + Recharts | Vercel-native, Tiptap for inline editing, Recharts for budget viz |
| Backend | Python 3.11 + FastAPI | Best ecosystem for retrieval, PDF parsing, pandoc orchestration |
| LLM provider (now) | **Gemini** via `google-genai` SDK | User-supplied key, OpenAI key parked for later swap |
| LLM models | `gemini-2.5-pro` for plan gen, `gemini-2.5-flash` for QC verdicts + refiner | Latency budget |
| Embeddings | `gemini-embedding-001` @ 768 dims | pgvector efficiency |
| Vector DB | Postgres 16 + pgvector via Docker | Designed for Neon swap on deploy |
| Inline editing | Tiptap (ProseMirror) with one editor instance per plan section | Section-level diffs are easy |
| Exports | pandoc CLI (single Markdown source → PDF + DOCX + LaTeX) | One pipeline, three formats |
| Self-learning | Per-team few-shot store keyed by `(team_id, experiment_type)` | Live demo of "next plan reflects prior corrections" |
| Voice | Out of scope for v1 | — |
| Project folder | `c:\Users\Eashan\Desktop\GitHub\hacknation\hacknation-scientist\` | — |

**Provider abstraction:** all LLM/embedding calls go through `api/llm.py` with a `LLM_PROVIDER` env var (default `gemini`). Flipping to OpenAI later is one env-var change.

---

## 2. Architecture

```
                ┌────────────────────────────────────────┐
                │   Next.js 14  (web/)   →  Vercel       │
                │   Tailwind · Tiptap · Recharts · SVG   │
                └──────────────────┬─────────────────────┘
                                   │  fetch(NEXT_PUBLIC_API_BASE)
                                   ▼
                ┌────────────────────────────────────────┐
                │   FastAPI  (api/)  →  localhost:8000   │
                │   /qc · /qc/with-source · /qc/broad    │
                │   /plan · /refine · /feedback · /export│
                └─────┬──────────┬────────────┬──────────┘
                      │          │            │
                      ▼          ▼            ▼
              ┌──────────┐  ┌─────────┐  ┌──────────┐
              │ Postgres │  │  Gemini │  │  pandoc  │
              │ pgvector │  │   API   │  │  binary  │
              └──────────┘  └─────────┘  └──────────┘
```

---

## 3. Repo layout

```
hacknation-scientist/
├── plan.md                       ← this document
├── README.md
├── .env                          ← real keys (gitignored)
├── .env.example                  ← schema only, committed
├── .gitignore
├── docker-compose.yml            ← postgres+pgvector
│
├── web/                          ← Next.js frontend
│   ├── app/
│   │   ├── layout.tsx            ← global fonts, palette CSS vars
│   │   ├── page.tsx              ← single-screen workspace
│   │   └── api/                  ← thin proxies to FastAPI (optional)
│   ├── components/
│   │   ├── QCCard.tsx            ← novelty meter + refs + fallback dialog
│   │   ├── PlanWorkspace.tsx     ← orchestrates sections + Tiptap
│   │   ├── PlanSection.tsx       ← one Tiptap instance per section
│   │   ├── BudgetChart.tsx       ← horizontal bar + donut (Recharts)
│   │   ├── TimelineGantt.tsx     ← hand-rolled SVG Gantt
│   │   ├── NoveltyMeter.tsx      ← hand-rolled SVG scale + brass needle
│   │   ├── MaterialsTable.tsx    ← catalog #s, supplier links
│   │   ├── PriorWorkRail.tsx     ← right rail: people fixtures
│   │   ├── EquipmentRail.tsx     ← right rail: equipment fixtures
│   │   ├── FeedbackPanel.tsx     ← natural language feedback
│   │   └── ExportMenu.tsx        ← PDF/DOCX/LaTeX
│   ├── lib/
│   │   ├── api.ts                ← typed client
│   │   └── design.ts             ← palette + type constants
│   ├── styles/
│   │   ├── globals.css
│   │   └── paper-texture.svg
│   ├── package.json
│   └── tailwind.config.ts
│
├── api/                          ← Python FastAPI backend
│   ├── main.py                   ← FastAPI app + routes
│   ├── llm.py                    ← Gemini/OpenAI provider abstraction
│   ├── settings.py               ← env loading via pydantic-settings
│   ├── agents/
│   │   ├── qc.py                 ← novelty verdict
│   │   ├── planner.py            ← experiment plan generator
│   │   ├── refiner.py            ← applies feedback, can reject with reason
│   │   ├── outreach.py           ← drafts emails to prior-work scientists
│   │   └── exporter.py           ← markdown render + pandoc orchestration
│   ├── rag/
│   │   ├── embeddings.py
│   │   ├── retriever.py          ← pgvector queries + S2 fallback
│   │   ├── s2_client.py          ← Semantic Scholar live API
│   │   └── pdf_extract.py        ← pymupdf
│   ├── schemas/
│   │   ├── plan.py               ← ExperimentPlan Pydantic
│   │   ├── qc.py                 ← QCResult, FallbackPrompt
│   │   └── feedback.py
│   ├── db/
│   │   ├── models.py             ← SQLAlchemy
│   │   ├── session.py
│   │   └── migrations.sql        ← raw SQL, not Alembic (faster)
│   ├── prompts/
│   │   ├── qc_system.md
│   │   ├── planner_system_brief.md
│   │   ├── planner_system_standard.md
│   │   ├── planner_system_deep.md
│   │   ├── refiner_system.md
│   │   └── outreach_system.md
│   ├── fixtures/
│   │   ├── mit_harvard_people.json   ← ~30 fake scientists, real-ish institutions
│   │   ├── equipment.json            ← ~50 pieces of equipment, locations
│   │   └── mock_responses/           ← cached LLM outputs for demo safety
│   ├── requirements.txt
│   └── pyproject.toml
│
└── ingest/                       ← one-shot corpus builder
    ├── ingest.py                 ← run once: ~5 min, ~$0.30 of embeddings
    ├── domains.yaml              ← 4 demo domains + S2 query templates
    └── protocols_seed.yaml       ← curated protocols.io + bio-protocol URLs
```

---

## 4. Database schema

```sql
-- teams: per-team self-learning isolation
create table teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    institution text,
    created_at timestamptz default now()
);

-- queries: every hypothesis the user submits
create table queries (
    id uuid primary key default gen_random_uuid(),
    team_id uuid references teams(id),
    question text not null,
    experiment_type text,                -- e.g. "biosensor.antibody.electrochemical"
    domain text,                         -- e.g. "diagnostics"
    created_at timestamptz default now()
);

-- plans: generated experiment plans (jsonb to match Pydantic schema)
create table plans (
    id uuid primary key default gen_random_uuid(),
    query_id uuid references queries(id),
    team_id uuid references teams(id),
    depth_mode text,                     -- brief | standard | deep
    plan jsonb not null,
    plan_markdown text,                  -- cached for export
    created_at timestamptz default now()
);

-- feedback: per-section corrections, the self-learning training signal
create table feedback (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid references plans(id),
    team_id uuid references teams(id),
    experiment_type text,
    section text,                        -- "protocol.step.3" | "budget" | etc.
    before text,
    after text,
    freeform_note text,
    accepted boolean,                    -- false = rejected by refiner with reason
    reason text,
    created_at timestamptz default now()
);

-- corpus_chunks: pre-indexed literature + protocols
create table corpus_chunks (
    id uuid primary key default gen_random_uuid(),
    source text,                         -- "semantic_scholar" | "protocols.io" | "bio-protocol" | "user_upload"
    source_id text,                      -- DOI / URL
    domain text,
    title text,
    authors text,
    year int,
    chunk_index int,
    text text not null,
    embedding vector(768),
    created_at timestamptz default now()
);

create index on corpus_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- query-scoped uploads (don't pollute the permanent corpus)
create table query_uploads (
    id uuid primary key default gen_random_uuid(),
    query_id uuid references queries(id),
    filename text,
    chunks jsonb,                        -- each chunk with its embedding
    created_at timestamptz default now()
);
```

---

## 5. Hour-by-hour milestones

### H0 (0:00 → 0:45) — Foundation, no science yet

- [ ] `.gitignore` (excludes `.env`, `node_modules`, `__pycache__`, `*.pyc`, `.venv`, `dist`, `.next`)
- [ ] `.env.example` with the schema (no values)
- [ ] `docker-compose.yml` with `pgvector/pgvector:pg16` on port 5432
- [ ] `api/` skeleton: FastAPI app, settings loader, `/health`, CORS to `localhost:3000`
- [ ] `api/llm.py` provider abstraction with Gemini default
- [ ] `web/` skeleton: Next.js 14 App Router + Tailwind + fonts
- [ ] CSS variables for the palette + paper texture
- [ ] **Smoke test:** `web → api → gemini` round-trip with a `/echo` route. *This catches env, CORS, and SDK problems before they cost an hour at H4.*
- [ ] Verify pandoc installs (`choco install pandoc` if needed) and `xelatex` is available; if not, weasyprint fallback ready.

**Definition of done:** I can curl `/health`, the Next.js page renders ivory-and-graphite, the dev DB is up, and one Gemini call works end-to-end.

### H1 (0:45 → 1:45) — Ingest the corpus once

- [ ] `ingest/domains.yaml` — 4 demo domains with Semantic Scholar query templates and curated protocol URLs.
- [ ] `ingest/ingest.py`: for each domain → S2 `paper/search` (~50 abstracts) + scrape ~10 protocol pages (`httpx` + `readability-lxml`) → chunk (~600 tokens, 80 overlap) → `gemini-embedding-001` → write to `corpus_chunks`.
- [ ] Total: ~1500 chunks, ~5 min runtime, ~$0.30. Reproducible via `python ingest/ingest.py`.
- [ ] **Sanity probe:** for each demo input, run a top-3 retrieval and eyeball that the returned chunks look domain-relevant.

### H2 (1:45 → 2:45) — QC pipeline

Three endpoints, one UX:

```
POST /qc { question, optional_pdf }
  → if pdf: pymupdf extract → embed → query_uploads
  → embed question → top-K from corpus_chunks (+ pdf chunks)
  → if max_sim < threshold AND no pdf:
       return { status: "no_indexed_knowledge", needs_user_choice: true }
  → else: gemini-2.5-flash verdict on retrieved refs
       → return { status, verdict, novelty_score (0-1), refs[1..3], rationale }

POST /qc/with-source { question, source_url | source_pdf }
  → fetch + chunk + embed source into a temp namespace tagged query_id
  → retrieve from that namespace + corpus → verdict
  → label refs with "user-supplied source" badge

POST /qc/broad { question }
  → straight Gemini call, no retrieval, system prompt forces [ungrounded] tags
  → UI shows sage banner: "Broad search — not literature-backed"
```

**Novelty threshold:** start at cosine 0.72, tune live during dry-run. Surfaces a meter, not a binary.

### H3 (2:45 → 4:00) — Plan generator

Pydantic `ExperimentPlan` schema (interview-driven, see §8):

```python
class ProtocolStep(BaseModel):
    id: str
    name: str
    duration_minutes: int
    rationale: str                          # WHY, not just what — Rule 1
    materials: list[str]                    # references to materials list
    equipment: list[str]
    qc_checks: list[str]
    assumed_skills: list[str] = []          # Rule 5
    can_run_parallel_with: list[str] = []   # Rule 6
    notes: str | None = None

class Material(BaseModel):
    name: str
    catalog_no: str | None
    supplier: str | None
    supplier_url: str | None                # Rule 9
    unit_size: str
    qty: float
    unit_cost_usd: float
    total_cost_usd: float
    lead_time_days: int | None
    shelf_life_days: int | None             # Rule 3
    storage: str | None
    order_priority: Literal["early", "middle", "late"] = "middle"

class EnvironmentalConditions(BaseModel):  # Rule 2 — top-level, not buried
    temp_range_C: tuple[float, float]
    humidity_pct: tuple[float, float] | None
    light: str | None
    atmosphere: str | None
    season_sensitivity: str | None

class ExperimentPlan(BaseModel):
    title: str
    hypothesis: str
    novelty_summary: str
    environmental_conditions: EnvironmentalConditions
    protocol: list[ProtocolStep]
    materials: list[Material]
    equipment: list[Equipment]
    budget: Budget
    timeline: list[Phase]
    staffing: list[StaffAssignment]
    validation: ValidationPlan
    references: list[Reference]
    open_questions: list[str] = []          # things that need scientist judgment
    budget_justification: str | None        # Rule 10
```

- Use Gemini's `response_schema` + `response_mime_type="application/json"` for structured outputs.
- Three depth modes (`brief` / `standard` / `deep`), each a different system prompt persona, each enforcing the 10 interview rules (§8).
- System prompt sees: top-K retrieved corpus chunks, the team's prior `team_examples` few-shot, scale_hint for budget calibration, the anti-AI-tone rubric, and the strict "if you can't ground a number, say so" instruction.
- Staff and equipment names drawn from `fixtures/*.json` — system prompt is told these are fixtures it must select from, never invent.

### H4 (4:00 → 5:00) — Tiptap UI + visual plan + feedback + self-learning loop

Layout (single screen):

```
┌──────────────────────────────────────────────────────────────┐
│  HUSKY LAB — AI SCIENTIST                       [team menu]  │
├──────────────────────────────────────────────────────────────┤
│  ▸ Question  [textarea]  [drop a paper for similarity]       │
│  ▸ Depth     ( ) brief  (•) standard  ( ) deep               │
│              [ Generate ]                                    │
├──────────────────────────────────────────────────────────────┤
│  ┌─ NOVELTY METER ──────────────────────────────────────┐    │
│  │   not_found ─────●───── similar_work ── exact_match  │    │
│  │   refs: [1] [2] [3]                                  │    │
│  └──────────────────────────────────────────────────────┘    │
├────────────────────────────────────┬─────────────────────────┤
│  PLAN  (Tiptap, sectioned)         │  PRIOR WORK BY          │
│  ┌─ Environmental Conditions ────┐ │  • Dr. K. Tang (MIT)    │
│  │ 22-25°C, 45-55% RH, ...       │ │    [draft outreach]     │
│  └────────────────────────────── ┘ │  • Dr. R. Patel (Harvard)│
│  ┌─ Protocol (8 steps) ────────  ┐ │                         │
│  │ 1. Coat electrode (15 min)    │ │  EQUIPMENT LOCATIONS    │
│  │    rationale: …               │ │  • Potentiostat → Bldg 16│
│  │    [more detail][less detail] │ │    Rm 311 (Tang Lab)    │
│  │ 2. ...                        │ │  • Centrifuge → ...     │
│  └────────────────────────────── ┘ │                         │
│  ┌─ Materials ───────────────── ┐  │                         │
│  │ table: catalog #s + suppliers│  │                         │
│  └──────────────────────────────┘  │                         │
│  ┌─ Budget (chart) ─────────────┐  │                         │
│  │ horizontal bars + donut      │  │                         │
│  └──────────────────────────────┘  │                         │
│  ┌─ Timeline (Gantt) ───────────┐  │                         │
│  │ SVG with parallel bars       │  │                         │
│  └──────────────────────────────┘  │                         │
│  ┌─ Validation ────────────────-┐  │                         │
│  └──────────────────────────────┘  │                         │
├────────────────────────────────────┴─────────────────────────┤
│  Feedback: [textarea]  [send]    Export: [PDF][DOCX][LaTeX]  │
└──────────────────────────────────────────────────────────────┘
```

**Tiptap setup:** one editor per `<PlanSection>` so blur-driven diffing is trivial. Each section has:
- `[more detail]` / `[less detail]` pills → one-shot Gemini call on that section only
- Inline edits captured on blur → POST to `/feedback` with section path

**Self-learning round-trip:**
1. Each correction stored as `(team_id, experiment_type, section, before, after, freeform_note, accepted, reason)`.
2. `experiment_type` derived at plan-gen time by a tiny classifier call (`gemini-2.5-flash` → slug).
3. Next plan-gen for same team + same `experiment_type` retrieves top-3 prior corrections and injects as: *"This team has previously corrected similar plans like so — apply equivalent rules where relevant: [diffs]"*.
4. Refiner has a rejection rubric: unsafe concentration / impossible timeline / contradicts cited protocol → `accepted=false` with `reason`. UI renders rejection as a brass-bordered margin note.

### H5 (5:00 → 6:00) — Exports + visual polish + demo dry-run

- [ ] `api/agents/exporter.py`: `ExperimentPlan` → Markdown → pandoc → `.pdf` / `.docx` / `.tex`. xelatex for proper serif rendering. One template file per format if needed for header/footer.
- [ ] Demo-mode cache (§9): cache the perfect outputs for the 4 sample inputs. `DEMO_MODE=true` serves cached, falls back to live for off-script. ~30 minutes well spent.
- [ ] Visual polish pass (paper texture, brass dividers, specimen-label section headers).
- [ ] **Dry-run all 4 sample inputs end-to-end.** CRP biosensor is the scripted money shot.
- [ ] Self-learning demo dry-run: CRP cycle 1 → user correction (e.g., "use serum, not whole blood, for ELISA comparator" + change "10 minutes" to "8 minutes") → save → re-run a slightly rephrased CRP query → both corrections appear unbidden in the new plan.

---

## 6. QC fallback flow (locked)

```
user submits question
        │
        ▼
   embed question
        │
        ▼
  retrieve top-K
        │
   ┌────┴────────────────┐
   │                     │
max_sim ≥ 0.72       max_sim < 0.72
   │                     │
   ▼                     ▼
gemini verdict     UI dialog:
on retrieved refs  ┌─────────────────────────────┐
                   │ We don't have indexed       │
                   │ literature on this question.│
                   │                             │
                   │ [Paste a source URL/PDF]    │
                   │ [Run a broad search anyway] │
                   └─────────────────────────────┘
                     │              │
                     ▼              ▼
                /qc/with-source  /qc/broad
                (live retrieval) (ungrounded LLM,
                from user source) sage banner:
                                  "not literature-backed")
```

Reads as careful and honest. Matches Fulcrum's tone.

---

## 7. Visual design system (locked)

| Token | Value |
|---|---|
| `--ivory` | `#F4EFE6` — page background |
| `--graphite` | `#2B2B2B` — primary text |
| `--sage` | `#9DAE94` — secondary, validation, "broad search" banner |
| `--brass` | `#A8794A` — accents, dividers, novelty needle, rejected-feedback border |
| `--rule` | `#D9CFBE` — fine dividers |
| `--paper` | `paper-texture.svg` @ 4% opacity over ivory |

Type:
- **Headings:** EB Garamond (Google Fonts), serif, generous tracking
- **Body:** Inter, sans
- **Mono (catalog #s, DOIs, durations):** JetBrains Mono

No drop shadows. No gradients. Border radius max 4px. Section headers styled as specimen labels: small-caps eyebrow line + serif title + brass underline + optional margin-note number.

---

## 8. Interview-driven design rules (LOCKED into system prompts)

These come from interviews with 5+ working scientists across inorganic chem, pharm in-vitro, miRNA/Harper Cancer Institute, Purcell/Hardwick labs, and a generalist call. Each is non-negotiable in the planner system prompt.

1. **Every protocol step ships with a `rationale` field** (the *why*). #1 "AI slop" detector named.
2. **`environmental_conditions` is a top-level plan section.** Inorganic-chem interviewee lost months because results varied between summer and winter.
3. **Reagent freshness / shelf-life is first-class metadata.** `shelf_life_days`, `storage`, `order_priority`. One interviewee's reagent went stale undetected because the bottle was nearly full.
4. **Numbers are never vague.** No "approximately", "about", "as needed". If we can't ground a number, the planner says "needs calibration".
5. **Steps declare `assumed_skills`.** Junior lab members get burned by assumed knowledge. depth=brief hides them, depth=deep expands inline.
6. **Parallelism is explicit.** Steps mark `can_run_parallel_with`. The Gantt actually renders parallel bars side-by-side.
7. **Trust badges on the three least-trusted sections** — timing, concentration values, step ordering. Sage margin notes acknowledge what scientists should double-check.
8. **Anti-sycophancy tone rubric.** Banned in system prompt: "Great question", "Certainly!", "I'd be happy to", emojis, hedging intensifiers. Voice target: senior postdoc dictating a methods section.
9. **Catalog numbers + supplier URLs on every material.** Pharm interviewee's #1 busywork.
10. **Budget calibration grounded in interview ranges.** Small inorganic chem $50–500; in-vitro pharm baseline ~$200; rare-earth metals or animal models up an order of magnitude. Plan must include `budget_justification` if it exceeds the scale_hint range.

---

## 9. Demo-safety layer

Live LLM calls during a demo are how demos die. We add `DEMO_MODE=true`:
- Pre-generated cached outputs for the 4 sample inputs (CRP / probiotic / trehalose / Sporomusa) live in `api/fixtures/mock_responses/`.
- When `DEMO_MODE=true` and the input matches one of the four (fuzzy match), serve the cached output instantly.
- Off-script questions still hit live Gemini.
- Dev mode (`DEMO_MODE=false`) is always live.

Cost: ~30 min in H5. Worth 10x.

---

## 10. Demo script (CRP biosensor money shot)

1. Type: *"A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect CRP in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching ELISA sensitivity without preprocessing."*
2. **Novelty meter** swings to "similar work exists", three S2 refs render as specimen labels.
3. Click **Generate plan** at depth=standard. Plan renders section-by-section: environmental conditions → 8-step protocol with rationales → materials with catalog #s → budget chart → SVG Gantt with parallel bars → validation → references.
4. **Right rail** shows two MIT/Harvard scientists who've worked on antibody functionalization (fixtures), each with a "draft outreach email" button. Equipment rail shows where the potentiostat lives.
5. Inline-edit one step: change "10 minutes" → "8 minutes". Click "more detail" on the antibody coating step.
6. Refiner re-renders that section with the change reflected and additional detail; shorter sections kept untouched.
7. **Self-learning proof:** type a slightly rephrased CRP question → new plan automatically uses "8 minutes" and the more-detailed coating language. Visible reflection of prior corrections, no re-prompting.
8. Click **Export → PDF**. Beautiful Garamond-rendered LaTeX-quality PDF opens.

---

## 11. Risks and dodges

| Risk | Dodge |
|---|---|
| Pandoc / xelatex missing on machine | Verify in H0, fall back to weasyprint+python-docx if needed |
| Gemini structured-output schema rejection | Keep schema flat-ish, no deep optional unions; smoke test in H3 before UI |
| Tiptap section diffing gets messy | One editor instance per section, not one big doc |
| Self-learning demo doesn't visibly fire | Bias few-shot injection to high weight; pick numerically obvious corrections |
| Gemini API hiccups during demo | DEMO_MODE cache (§9) |
| Budget hallucinations | Scale hint + interview-grounded calibration anchors in system prompt |
| Plan mentions catalog #s that don't exist | Retrieval-grounding requirement: no catalog # without a corpus chunk citation |
| 6h is tight solo | Cut order if behind: Word export → outreach email drafting → equipment fixtures → staff fixtures (collapse to one demo team panel). Never cut: QC card, plan generator, Tiptap inline edit, self-learning round-trip, PDF export. |

---

## 12. Definition of "done" for the demo

- [ ] All 4 sample inputs produce a complete plan end-to-end.
- [ ] CRP money-shot demo runs flawlessly (script in §10) in <90 seconds total.
- [ ] Self-learning round-trip is visible without explanation.
- [ ] PDF export looks like something an MIT lab would actually email out.
- [ ] No "AI tells" in the prose (no sycophancy, no emojis, no exclamation points).
- [ ] The visual feels like a research institute, not a SaaS landing page.

---

## 13. Open items (decide before/during build)

- [ ] Final novelty threshold (start 0.72 cosine, tune in dry-run)
- [ ] Gemini model exact versions — `gemini-2.5-pro` and `gemini-2.5-flash` confirmed live before H3
- [ ] Whether to log the `[ungrounded]` warning in the exported PDF too (default yes)
- [ ] Team identity: "Husky Lab @ MIT" — confirmed
