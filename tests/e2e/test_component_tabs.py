import os
import subprocess
import time
from playwright.sync_api import sync_playwright

output_dir = os.environ.get("SCREENSHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "screenshots"))
os.makedirs(output_dir, exist_ok=True)

def test_component_tabs():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    srv = subprocess.Popen(
        "npx vite --port 5198",
        shell=True,
        cwd=root_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(4)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(channel="chrome", headless=True)
            pg = b.new_page(viewport={"width": 1280, "height": 900})
            pg.goto("http://localhost:5198/#/components")
            pg.wait_for_timeout(1000)

            # Ensure dark mode
            pg.evaluate("""() => {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }""")
            pg.wait_for_timeout(300)

            # Tab 1: Buttons
            pg.screenshot(path=os.path.join(output_dir, "tab_buttons_dark.png"))

            # Tab 2: Forms
            pg.locator("button:has-text('FORMS')").click()
            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(output_dir, "tab_forms_dark.png"))

            # Tab 3: Cards
            pg.locator("button:has-text('CARDS')").click()
            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(output_dir, "tab_cards_dark.png"))

            # Tab 4: Loaders
            pg.locator("button:has-text('LOADERS')").click()
            pg.wait_for_timeout(300)
            pg.screenshot(path=os.path.join(output_dir, "tab_loaders_dark.png"))

            print("[OK] All component tabs captured successfully.")
            b.close()
    finally:
        subprocess.call(f"taskkill /F /T /PID {srv.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    test_component_tabs()
