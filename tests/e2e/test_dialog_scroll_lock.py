import os
import subprocess
import time
import json
from playwright.sync_api import sync_playwright

output_dir = os.environ.get("SCREENSHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "screenshots"))
os.makedirs(output_dir, exist_ok=True)

def test_dialog_scroll_lock():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    srv = subprocess.Popen(
        "npx vite --port 5199",
        shell=True,
        cwd=root_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(4)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(channel="chrome", headless=True)
            pg = b.new_page(viewport={"width": 1280, "height": 800})
            pg.goto("http://localhost:5199/#/components")
            pg.wait_for_timeout(1000)
            pg.evaluate("document.documentElement.classList.add('dark')")
            
            # Navigate to dialog section
            pg.locator("button:has-text('LOADERS')").click()
            pg.wait_for_timeout(300)

            measure = "() => { const r = document.querySelector('header').getBoundingClientRect(); return [r.left, r.width, document.documentElement.scrollWidth, document.documentElement.clientWidth] }"
            before = pg.evaluate(measure)

            # Open Dialog
            pg.locator("button:has-text('MỞ DIALOG')").first.click()
            pg.wait_for_timeout(400)
            after = pg.evaluate(measure)

            locked = pg.evaluate("document.documentElement.classList.contains('nb-scroll-locked')")
            pg.screenshot(path=os.path.join(output_dir, "dialog_dark_locked.png"))

            # Press Escape to close
            pg.keyboard.press("Escape")
            pg.wait_for_timeout(300)
            released = not pg.evaluate("document.documentElement.classList.contains('nb-scroll-locked')")

            # Check box shadows in dark mode are clean
            non_white_shadows = pg.evaluate("""() => {
                const s = new Set();
                document.querySelectorAll('*').forEach(e => {
                    const v = getComputedStyle(e).boxShadow;
                    if (v && v !== 'none') s.add(v);
                });
                return [...s].filter(v => !v.includes('255, 255, 255')).slice(0, 5);
            }""")

            res = {
                "before": before,
                "after": after,
                "locked": locked,
                "released": released,
                "non_white_shadows": non_white_shadows,
                "layout_shift_px": abs(before[0] - after[0]) + abs(before[1] - after[1])
            }
            print(json.dumps(res, indent=2))
            assert res["layout_shift_px"] == 0, "Zero layout shift expected"
            assert res["locked"], "Scroll must be locked when dialog is open"
            assert res["released"], "Scroll must be released when dialog closes"
            b.close()
    finally:
        subprocess.call(f"taskkill /F /T /PID {srv.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    test_dialog_scroll_lock()
