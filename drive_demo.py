"""Drive the AI Scientist demo end-to-end via Playwright, taking screenshots
at each step. Run from project root after the dev servers are up."""
from __future__ import annotations

import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

OUT = Path("screenshots")
OUT.mkdir(exist_ok=True)


def shot(page, name: str, full_page: bool = True) -> None:
    p = OUT / name
    page.screenshot(path=str(p), full_page=full_page)
    print(f"  shot -> {p}")


def main() -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = context.new_page()
        page.set_default_timeout(15000)

        # 1. Empty workspace
        print("[1] open page")
        page.goto("http://localhost:3000")
        page.wait_for_selector("text=Husky Lab")
        time.sleep(1)
        shot(page, "01_empty.png")

        # 2. Click CRP preset
        print("[2] click CRP preset")
        page.get_by_role("button", name="CRP biosensor").click()
        time.sleep(0.5)
        shot(page, "02_question_filled.png")

        # 3. Run QC
        print("[3] run QC (~10s)")
        page.get_by_role("button", name="1 · Run literature QC").click()
        page.wait_for_selector("text=Has this been done before?", timeout=60000)
        time.sleep(2)  # let novelty meter animate
        shot(page, "03_qc_result.png")

        # 4. Generate plan
        print("[4] generate plan (~40s)")
        page.get_by_role("button", name="2 · Generate plan").click()
        page.wait_for_selector("text=Stage 03 · Experiment Plan", timeout=180000)
        time.sleep(3)
        shot(page, "04_plan_top.png")

        # 5. Scroll to budget
        print("[5] scroll to budget")
        page.locator("text=05 · Budget").first.scroll_into_view_if_needed()
        time.sleep(1.5)
        shot(page, "05_budget.png", full_page=False)

        # 6. Scroll to timeline
        print("[6] scroll to timeline")
        page.locator("text=06 · Timeline").first.scroll_into_view_if_needed()
        time.sleep(1)
        shot(page, "06_timeline.png", full_page=False)

        # 7. Scroll to materials
        print("[7] scroll to materials")
        page.locator("text=04 · Materials").first.scroll_into_view_if_needed()
        time.sleep(1)
        shot(page, "07_materials.png", full_page=False)

        # 8. Right rail (prior work + equipment)
        print("[8] scroll to right rail")
        page.locator("text=Prior Work By").first.scroll_into_view_if_needed()
        time.sleep(1)
        shot(page, "08_right_rail.png", full_page=False)

        # 9. Submit feedback
        print("[9] submit feedback (~10s)")
        page.locator("text=Stage 04 · Scientist Review").scroll_into_view_if_needed()
        time.sleep(0.5)
        textarea = page.locator("textarea").last
        textarea.fill(
            "Use serum, not whole blood, for the ELISA comparator. "
            "Tighten the read-out window from 10 minutes to 8 minutes."
        )
        time.sleep(0.5)
        shot(page, "09_feedback_typed.png", full_page=False)
        page.get_by_role("button", name="Apply correction").click()
        page.wait_for_selector("text=applied", timeout=60000)
        time.sleep(2)
        shot(page, "10_feedback_applied.png", full_page=False)

        # 10. Run again with rephrased question
        print("[10] regenerate with rephrased question (~40s)")
        # scroll back to top
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)
        page.locator("textarea").first.fill(
            "Can a paper-based electrochemical immunosensor coated with anti-CRP "
            "antibodies reliably detect C-reactive protein at sub-0.5 mg/L "
            "concentrations from a finger-prick blood sample within ten minutes?"
        )
        time.sleep(0.5)
        page.get_by_role("button", name="2 · Generate plan").click()
        page.wait_for_selector("text=Self-learning", timeout=180000)
        time.sleep(3)
        shot(page, "11_self_learning_banner.png")

        # 11. Verify "serum" / "8 min" appear in protocol
        print("[11] check protocol mentions serum/8 min")
        page.locator("text=03 · Protocol").first.scroll_into_view_if_needed()
        time.sleep(1)
        shot(page, "12_corrected_protocol.png", full_page=False)

        # 12. QC fallback dialog (CO2 case)
        print("[12] test fallback dialog with CO2 sample")
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.5)
        page.get_by_role("button", name="Sporomusa CO₂").click()
        time.sleep(0.5)
        page.get_by_role("button", name="1 · Run literature QC").click()
        page.wait_for_selector("text=We don", timeout=60000)
        time.sleep(2)
        shot(page, "13_fallback_dialog.png")

        browser.close()
        print("\ndone — screenshots in screenshots/")


if __name__ == "__main__":
    main()
