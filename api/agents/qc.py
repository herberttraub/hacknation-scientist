"""QC verdict — given retrieved references, classify novelty.

Three flows feed into one verdict function:
1. Indexed corpus retrieval (default /qc)
2. User-supplied source retrieval (/qc/with-source)
3. Ungrounded LLM (/qc/broad) — bypasses verdict, model speaks directly with [ungrounded] tags
"""
from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent

from .. import llm
from ..rag import retriever
from ..rag.pdf_extract import fetch_url_as_text
from ..schemas.qc import QCResult, Reference
from ..settings import settings


_MOCK_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "mock_responses"


def _qc_demo_match(question: str) -> QCResult | None:
    """Return cached QC result when DEMO_MODE is on and the question matches."""
    if not settings.DEMO_MODE:
        return None
    q = question.lower()
    keys = {
        "qc_crp.json": ["crp", "c-reactive protein", "biosensor", "anti-crp"],
        "qc_cryo.json": ["trehalose", "cryoprotectant", "hela", "post-thaw"],
        "qc_gut.json": ["lactobacillus", "intestinal permeability", "fitc-dextran", "claudin"],
        "qc_co2.json": ["sporomusa", "ovata", "bioelectrochemical", "co2"],
    }
    for fname, kws in keys.items():
        if sum(1 for kw in kws if kw in q) >= 2:
            path = _MOCK_DIR / fname
            if path.exists():
                try:
                    return QCResult.model_validate(json.loads(path.read_text(encoding="utf-8")))
                except Exception:
                    return None
    return None


VERDICT_SCHEMA = {
    "type": "object",
    "properties": {
        "status": {
            "type": "string",
            "enum": ["not_found", "similar_work_exists", "exact_match_found"],
        },
        "novelty_score": {"type": "number"},
        "rationale": {"type": "string"},
        "best_ref_indices": {
            "type": "array",
            "items": {"type": "integer"},
            "description": "Indices into the input refs list, ordered by relevance, max 3.",
        },
    },
    "required": ["status", "novelty_score", "rationale", "best_ref_indices"],
}


VERDICT_SYSTEM = dedent(
    """
    You are a senior research methods reviewer. You are shown a scientist's
    hypothesis and a set of literature references retrieved by similarity search.
    Decide if the *exact* experiment has been done before, if similar work exists,
    or if the question appears genuinely novel.

    Output strict JSON matching the schema. Voice: terse, factual, methods-section
    register. No "Great question", no exclamation points, no emojis.

    Calibration:
      exact_match_found  -> the same intervention + measurement exists in the refs
      similar_work_exists -> overlapping methods or near-identical hypothesis
      not_found          -> refs are tangential or off-topic

    novelty_score: 1.0 = totally novel, 0.0 = exact published match.
    """
).strip()


def _refs_block(records: list[dict]) -> str:
    lines = []
    for i, r in enumerate(records):
        title = r.get("title") or "(untitled)"
        year = r.get("year") or ""
        sim = r.get("similarity") or 0.0
        snippet = (r.get("text") or "")[:600].replace("\n", " ")
        lines.append(f"[{i}] ({year}) sim={sim:.2f}  {title}\n     {snippet}")
    return "\n\n".join(lines)


def _to_reference(r: dict, similarity_override: float | None = None) -> Reference:
    return Reference(
        title=r.get("title") or "",
        authors=r.get("authors") or "",
        year=r.get("year"),
        source=r.get("source") or "",
        source_id=r.get("source_id") or "",
        url=r.get("source_id") if (r.get("source_id") or "").startswith("http") else "",
        similarity=similarity_override if similarity_override is not None else float(r.get("similarity") or 0.0),
        snippet=(r.get("text") or "")[:300],
    )


def run_verdict(question: str, retrieved: list[dict]) -> QCResult:
    """Given retrieved corpus chunks, classify novelty."""
    if not retrieved:
        return QCResult(
            status="no_indexed_knowledge",
            novelty_score=0.5,
            rationale="No similar literature found in our index.",
            references=[],
            needs_user_choice=True,
            fallback_options=["provide_source", "broad_general_search"],
        )

    prompt = dedent(
        f"""
        HYPOTHESIS
        ----------
        {question.strip()}

        RETRIEVED REFERENCES
        --------------------
        {_refs_block(retrieved)}
        """
    ).strip()

    try:
        out = llm.generate_structured(
            prompt,
            response_schema=VERDICT_SCHEMA,
            system=VERDICT_SYSTEM,
            model=settings.GEMINI_MODEL_FLASH,
        )
    except Exception as e:
        return QCResult(
            status="similar_work_exists",
            novelty_score=0.5,
            rationale=f"Verdict failed; showing top retrieved refs anyway. ({e})",
            references=[_to_reference(r) for r in retrieved[:3]],
        )

    best_idxs = (out.get("best_ref_indices") or [])[:3]
    refs = [_to_reference(retrieved[i]) for i in best_idxs if 0 <= i < len(retrieved)]
    return QCResult(
        status=out.get("status", "similar_work_exists"),
        novelty_score=float(out.get("novelty_score", 0.5)),
        rationale=out.get("rationale", ""),
        references=refs,
    )


def run_qc(question: str) -> QCResult:
    """Default flow: search the indexed corpus, decide if we have signal."""
    cached = _qc_demo_match(question)
    if cached is not None:
        return cached
    hits = retriever.search_corpus(question, k=8)
    if not hits or (hits[0].get("similarity") or 0) < settings.NOVELTY_THRESHOLD:
        return QCResult(
            status="no_indexed_knowledge",
            novelty_score=0.5,
            rationale=(
                "Top retrieval below threshold "
                f"({(hits[0].get('similarity') or 0):.2f} < {settings.NOVELTY_THRESHOLD:.2f}). "
                "We do not have indexed literature on this question."
                if hits
                else "No indexed literature on this question."
            ),
            references=[_to_reference(r) for r in hits[:2]] if hits else [],
            needs_user_choice=True,
            fallback_options=["provide_source", "broad_general_search"],
        )
    return run_verdict(question, hits)


def run_qc_with_source(question: str, source_url: str | None = None, source_text: str | None = None) -> QCResult:
    """User supplied a source — retrieve from THAT, plus the indexed corpus."""
    text = source_text or ""
    if source_url and not text:
        try:
            text = fetch_url_as_text(source_url)
        except Exception as e:
            return QCResult(
                status="no_indexed_knowledge",
                novelty_score=0.5,
                rationale=f"Failed to fetch source: {e}",
                needs_user_choice=True,
                fallback_options=["broad_general_search"],
            )

    user_hits = retriever.search_against_text(question, text, k=5)
    corpus_hits = retriever.search_corpus(question, k=4)
    merged = (user_hits or []) + (corpus_hits or [])
    if not merged:
        return QCResult(
            status="not_found",
            novelty_score=0.85,
            rationale="No similar passages found in the supplied source or our index.",
            references=[],
        )
    return run_verdict(question, merged)


BROAD_SYSTEM = dedent(
    """
    You have NO retrieval grounding. You are answering from general knowledge only.

    Every factual claim you make MUST be marked with the literal tag [ungrounded]
    immediately after it. Do not invent specific paper titles, authors, DOIs, or
    catalog numbers — if you must reference work, describe it generally.

    Decide whether the user's hypothesis is likely to have been studied before:
      not_found  /  similar_work_exists  /  exact_match_found

    Voice: terse, factual, methods-section register. No "Great question",
    no exclamation points, no emojis.
    """
).strip()


BROAD_SCHEMA = {
    "type": "object",
    "properties": {
        "status": {"type": "string", "enum": ["not_found", "similar_work_exists", "exact_match_found"]},
        "novelty_score": {"type": "number"},
        "rationale": {"type": "string"},
    },
    "required": ["status", "novelty_score", "rationale"],
}


def run_qc_broad(question: str) -> QCResult:
    """No retrieval — straight LLM call. Tag everything [ungrounded]."""
    try:
        out = llm.generate_structured(
            f"HYPOTHESIS\n----------\n{question.strip()}",
            response_schema=BROAD_SCHEMA,
            system=BROAD_SYSTEM,
            model=settings.GEMINI_MODEL_FLASH,
        )
    except Exception as e:
        return QCResult(
            status="ungrounded",
            novelty_score=0.5,
            rationale=f"Broad search failed: {e}",
            is_ungrounded=True,
        )

    return QCResult(
        status=out.get("status", "similar_work_exists"),
        novelty_score=float(out.get("novelty_score", 0.5)),
        rationale=out.get("rationale", ""),
        references=[],
        is_ungrounded=True,
    )
