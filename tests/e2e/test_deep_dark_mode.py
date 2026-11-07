import os
import subprocess
import time
from playwright.sync_api import sync_playwright

output_dir = os.environ.get("SCREENSHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "screenshots"))
os.makedirs(output_dir, exist_ok=True)

def test_deep_dark_mode():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    srv = subprocess.Popen(
        "npx vite --port 5197",
        shell=True,
        cwd=root_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(4)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(channel="chrome", headless=True)

            # 1. Desktop Portfolio
            page = b.new_page(viewport={"width": 1440, "height": 900})
            page.goto("http://localhost:5197/#/")
            page.wait_for_timeout(1000)

            page.evaluate("""() => {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }""")
            page.wait_for_timeout(300)
            page.screenshot(path=os.path.join(output_dir, "portfolio_desktop_dark.png"))

            # 2. Mobile Portfolio
            mobile_context = b.new_context(
                viewport={"width": 390, "height": 844},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            )
            mobile_page = mobile_context.new_page()
            mobile_page.goto("http://localhost:5197/#/")
            mobile_page.wait_for_timeout(1000)
            mobile_page.evaluate("""() => {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }""")
            mobile_page.wait_for_timeout(300)
            mobile_page.screenshot(path=os.path.join(output_dir, "portfolio_mobile_dark.png"))

            print("[OK] Desktop & Mobile Deep Dark Mode captured successfully.")
            b.close()
    finally:
        subprocess.call(f"taskkill /F /T /PID {srv.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    test_deep_dark_mode()
