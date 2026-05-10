# -*- coding: utf-8 -*-
"""
Indxx 13F Reconnaissance
=========================
Quick test - checks whether Indxx serves the 13F page contents to a Python
client, and reports whether performance data is in the static HTML or
loaded dynamically via JavaScript.

Run from any folder:
    python indxx_recon.py
"""

import sys
import re
from pathlib import Path

print("=" * 70)
print("Indxx 13F Reconnaissance")
print("=" * 70)

URLS = [
    "https://www.indxx.com/indices/strategy/indxx-super-investors-f13-index",
    "https://www.indxx.com/index/indxx-super-institutional-investors-13-f-index",
]

# Try cloudscraper first, then plain requests
try:
    import cloudscraper
    session = cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "mobile": False}
    )
    print("[i] Using cloudscraper")
except ImportError:
    import requests
    session = requests.Session()
    print("[i] cloudscraper not installed, using plain requests")
    print("    (run: pip install cloudscraper)")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

successful_url = None
html = None

for url in URLS:
    print(f"\n>> Trying: {url}")
    try:
        r = session.get(url, headers=HEADERS, timeout=20)
        print(f"   Status: {r.status_code}")
        print(f"   Length: {len(r.text):,} chars")
        if r.status_code == 200 and len(r.text) > 1000:
            successful_url = url
            html = r.text
            print(f"   [OK] reachable")
            break
        else:
            print(f"   [X] not usable")
    except Exception as e:
        print(f"   [X] error: {e}")

if not html:
    print("\n[FAIL] Could not reach any Indxx URL.")
    print("This may be because Indxx is blocking your network.")
    print("Try opening the URL in a browser to confirm it works there.")
    sys.exit(1)

print(f"\n[OK] Got HTML from: {successful_url}")
print(f"     Saved to: indxx_response.html")

Path("indxx_response.html").write_text(html, encoding="utf-8")

# Heuristics: is the data in the HTML, or loaded dynamically?
print("\n" + "=" * 70)
print("Looking for performance keywords in static HTML...")
print("=" * 70)

keywords = [
    ("YTD", "Year-to-date label"),
    ("1 Year", "1 year label"),
    ("3 Year", "3 year label"),
    ("Annualized", "Annualized label"),
    ("Total Return", "Total Return label"),
    ("Performance", "Performance section"),
    ("NVIDIA", "Top holding (NVDA)"),
    ("Apple", "Apple in holdings"),
]

found_count = 0
for kw, desc in keywords:
    if kw.lower() in html.lower():
        found_count += 1
        # Check if there's a number/percent nearby
        idx = html.lower().find(kw.lower())
        snippet = html[max(0, idx-50):idx+200]
        has_percent = "%" in snippet
        has_digits = any(c.isdigit() for c in snippet)
        marker = "[OK with data]" if (has_percent or has_digits) else "[OK label only]"
        print(f"  {marker} {kw:<20s} ({desc})")
    else:
        print(f"  [X]            {kw:<20s} ({desc})")

print(f"\n{found_count}/{len(keywords)} keywords found in static HTML.")

# Look for percent patterns
percents = re.findall(r"[+-]?\d{1,3}\.\d{1,2}\s*%", html)
print(f"\nPercent-like values in HTML: {len(percents)}")
if percents:
    print(f"  First 15 examples: {percents[:15]}")

# Check for SPA hints
print("\n" + "=" * 70)
print("SPA/JavaScript hints (if present, we'd need Playwright):")
print("=" * 70)

spa_signs = [
    ("react", "React framework"),
    ("vue", "Vue framework"),
    ("angular", "Angular framework"),
    ("__next", "Next.js app"),
    ("data-react", "React data binding"),
    ("ng-app", "Angular app"),
    ("ng-controller", "Angular controller"),
]

for sign, desc in spa_signs:
    if sign in html.lower():
        print(f"  [!] {sign:<20s} - {desc}")

print("\n" + "=" * 70)
print("VERDICT")
print("=" * 70)
if found_count >= 4 and len(percents) > 5:
    print("[OK] Static HTML contains the data. We can scrape with requests + BS4.")
elif found_count >= 2:
    print("[?] Some labels present but few numbers. Site may be partly dynamic.")
    print("    Open indxx_response.html and search for the YTD value manually.")
    print("    If it's there with a percentage, we can scrape it.")
else:
    print("[!] Data appears to be loaded dynamically by JavaScript.")
    print("    We'll need Playwright (a headless browser) to scrape it.")

print("\nNext step: send the printout above back to Claude.")
