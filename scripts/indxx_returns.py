# -*- coding: utf-8 -*-
"""
Indxx 13F Index Scraper
=========================
Pulls live data from:
https://www.indxx.com/index/indxx-super-institutional-investors-13-f-index

Output:
- docs/data/indxx_13f.json  (returns table + 60 holdings + metadata)
"""

import sys
import re
import json
from datetime import datetime
from pathlib import Path

from bs4 import BeautifulSoup

try:
    import cloudscraper
    SESSION = cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "mobile": False}
    )
    print("[i] Using cloudscraper")
except ImportError:
    import requests
    SESSION = requests.Session()
    print("[i] cloudscraper not installed, falling back to requests")


URL = "https://www.indxx.com/index/indxx-super-institutional-investors-13-f-index"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_html():
    print(f">> Fetching: {URL}")
    r = SESSION.get(URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    print(f"   Status: {r.status_code}")
    print(f"   Length: {len(r.text):,} chars")
    return r.text


def parse_returns_table(soup):
    """
    Find the Risk & Return Statistics table.
    Identified by: <table class="... font-inter-tight"> with thead containing
    Statistic, QTD, YTD, 1 Year, 3 Year, Since Base Date.
    """
    target_headers = {"statistic", "qtd", "ytd", "1 year", "3 year", "since base date"}

    for table in soup.find_all("table"):
        thead = table.find("thead")
        if not thead:
            continue
        ths = [th.get_text(strip=True).lower() for th in thead.find_all("th")]
        if not target_headers.issubset(set(ths)):
            continue

        # Found it
        result = {
            "headers": [th.get_text(strip=True) for th in thead.find_all("th")],
            "rows": [],
        }
        for tr in table.find("tbody").find_all("tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all("td")]
            if len(cells) >= 2:
                result["rows"].append({
                    "label": cells[0],
                    "values": cells[1:],
                })
        return result

    return None


def parse_holdings_table(soup):
    """
    Find the holdings table. Identified by:
    <table class="w-full text-white border-collapse"> WITHOUT 'font-inter-tight'.
    Each row: <td>name</td> <td><div>percent</div></td>
    """
    holdings = []

    for table in soup.find_all("table"):
        cls = table.get("class", [])
        cls_str = " ".join(cls) if isinstance(cls, list) else str(cls)
        if "border-collapse" not in cls_str:
            continue
        if "font-inter-tight" in cls_str:
            continue  # not the holdings table

        tbody = table.find("tbody")
        if not tbody:
            continue

        for tr in tbody.find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) < 2:
                continue
            name = tds[0].get_text(strip=True)
            # weight is inside a <div> within the second td
            div = tds[1].find("div")
            weight = div.get_text(strip=True) if div else tds[1].get_text(strip=True)
            if name and weight:
                holdings.append({"name": name, "weight": weight})

        if holdings:
            return holdings

    return holdings


def extract_returns_summary(returns_table):
    """
    Extract just the Returns row, mapped by period name.
    Returns dict like: {"qtd": "15.48%", "ytd": "11.56%", ...}
    """
    if not returns_table:
        return {}

    headers = returns_table["headers"]  # ["Statistic", "QTD", "YTD", "1 Year", "3 Year", "Since Base Date"]
    period_keys = ["qtd", "ytd", "1y", "3y", "since_base"]

    summary = {}
    for row in returns_table["rows"]:
        label = row["label"].lower()
        # Returns row is labeled "Returns" or "Returns²" etc.
        if label.startswith("returns"):
            for i, value in enumerate(row["values"]):
                if i < len(period_keys):
                    summary[period_keys[i]] = value
            break
    return summary


def main():
    print("=" * 60)
    print("Indxx 13F Index Scraper")
    print("=" * 60)

    try:
        html = fetch_html()
    except Exception as e:
        print(f"[X] Network error: {e}")
        # Save error state so the page can show it gracefully
        save_error(f"Network error: {e}")
        sys.exit(1)

    soup = BeautifulSoup(html, "html.parser")

    print("\n>> Parsing Risk & Return table...")
    returns_table = parse_returns_table(soup)
    if returns_table:
        print(f"   [OK] Found {len(returns_table['rows'])} rows: "
              f"{[r['label'] for r in returns_table['rows']]}")
    else:
        print("   [X] Returns table not found")

    print("\n>> Parsing Holdings table...")
    holdings = parse_holdings_table(soup)
    print(f"   [OK] Found {len(holdings)} holdings")
    if holdings:
        print(f"   Top 5: {[h['name'][:30] + ' ' + h['weight'] for h in holdings[:5]]}")

    summary = extract_returns_summary(returns_table)

    payload = {
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "updated_at_display": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "source": URL,
        "index_name": "Indxx Super Institutional Investors Holdings 13F Index",
        "returns_summary": summary,
        "returns_table": returns_table,
        "holdings": holdings,
        "holdings_count": len(holdings),
        "status": "ok" if returns_table and holdings else "partial",
    }

    save_payload(payload)

    print()
    print("=" * 60)
    print("[OK] Done")
    print(f"  Returns periods captured: {list(summary.keys())}")
    print(f"  Holdings: {len(holdings)}")
    print("=" * 60)


def save_error(message):
    payload = {
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "updated_at_display": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "status": "error",
        "error": message,
    }
    save_payload(payload)


def save_payload(payload):
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    out = repo_root / "docs" / "data" / "indxx_13f.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"\n[OK] Saved: {out}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
    except Exception as e:
        print(f"\n[X] Error: {e}")
        import traceback
        traceback.print_exc()
        save_error(str(e))
        sys.exit(1)
