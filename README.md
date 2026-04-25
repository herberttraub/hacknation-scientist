# Husky Lab — AI Scientist

**Hypothesis → Literature QC → Runnable experiment plan.**

Built for **Fulcrum Science**'s AI Scientist challenge at Hacknation, MIT.

See [`plan.md`](./plan.md) for full architecture and the 6-hour build plan.

## Quick start

```bash
# 0. Make sure Docker Desktop is running
docker compose up -d

# 1. Backend
python -m venv .venv
.venv/Scripts/activate            # Windows (use source .venv/bin/activate on Mac/Linux)
pip install -r api/requirements.txt
.venv/Scripts/python.exe -m uvicorn api.main:app --port 8765 --host 127.0.0.1

# 2. Frontend (new terminal)
cd web
npm install
npm run dev                       # http://localhost:3000

# 3. Seed the literature corpus (one-shot, ~2 min, ~$0.30 in embeddings)
.venv/Scripts/python.exe -m ingest.ingest
```

Copy `.env.example` to `.env` and fill in `GEMINI_KEY` (defaults to Gemini; OpenAI is wired but parked).

## Demo script (CRP biosensor — the money shot)

1. Open `http://localhost:3000`. Click **CRP biosensor** preset.
2. Click **Run literature QC** → novelty meter swings to *similar work exists* with three real DOIs.
3. Click **Generate plan** → 9-step protocol with rationales, materials with catalog numbers, $4k budget chart, week-by-week Gantt, MIT/Harvard collaborators in the right rail.
4. In the **Feedback panel**, paste:
   > *Use serum, not whole blood, for the ELISA comparator. Tighten the read-out window from 10 minutes to 8 minutes.*

   Click **Apply correction**. The refiner accepts.
5. Lightly rephrase the original question (e.g. "Can a paper-based electrochemical immunosensor coated with anti-CRP antibodies reliably detect CRP at sub-0.5 mg/L from a finger-prick blood sample within ten minutes?") and click **Generate plan** again.
6. The new plan now mentions **serum** repeatedly, **8 minutes** as the read-out window, and **0 mentions of "10 minutes"**. A sage banner above the plan says *"Self-learning · this team's 1 prior correction on similar plans was folded into this generation without re-prompting."*
7. Click **Export → PDF**. A Garamond-rendered PDF downloads.

## What's inside

- **Backend (`api/`)** — FastAPI, Gemini-2.5-flash, pgvector retrieval over an indexed corpus of ~80 abstracts + protocols across the four sample domains (CRP biosensor, mouse probiotic, HeLa cryopreservation, Sporomusa CO₂).
- **Schema (`api/schemas/plan.py`)** — `ExperimentPlan` Pydantic model with all 10 interview-driven rules baked in (rationale per step, environmental conditions, shelf-life metadata, parallelism markers, assumed_skills, supplier URLs).
- **Frontend (`web/`)** — Next.js 14 + Tailwind + Recharts. Hand-rolled SVG novelty meter and Gantt timeline. Specimen-label section headers, oxidized brass accents, archival paper texture.
- **Self-learning** — per-team few-shot store keyed by domain. New plans pull the team's recent corrections via `_team_examples` and inject them as constraints in the planner system prompt.
- **QC fallback** — when retrieval similarity is below threshold, the UI surfaces a *"we don't have indexed literature"* dialog with two options: paste a source URL/PDF, or run a broad ungrounded search (results clearly labeled `[ungrounded]`).
- **Exports** — Markdown, PDF (xhtml2pdf, no LaTeX dep), DOCX, LaTeX (.tex). All from a single Markdown render.

## Endpoints

- `POST /qc` — default literature QC against indexed corpus
- `POST /qc/with-source` — QC against a user-supplied URL or PDF upload
- `POST /qc/broad` — ungrounded LLM-only search (every claim labeled)
- `POST /plan` — generate the full experiment plan
- `POST /feedback` — store a scientist correction
- `POST /refine` — apply more_detail / less_detail / freeform changes to a section
- `GET  /plan/{id}/export?format=pdf|docx|tex|md`
