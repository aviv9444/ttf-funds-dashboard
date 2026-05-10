# -*- coding: utf-8 -*-
"""
TTF Returns Fetcher - Dashboard Version
מושך תשואות לכל קרנות תכלית TTF מאתר ביזפורטל ושומר כ-JSON.
ה-JSON נטען על ידי דף האינטרנט ב-GitHub Pages.
"""

import sys
import os
import time
import re
import json
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

try:
    import cloudscraper
    SESSION = cloudscraper.create_scraper(
        browser={"browser": "chrome", "platform": "windows", "mobile": False}
    )
    print("[i] Using cloudscraper (Cloudflare bypass)")
except ImportError:
    SESSION = requests.Session()
    print("[i] Using plain requests (install cloudscraper if 403 errors occur)")


# ============================================================
# Funds list - extracted from Tachlit's official PDF catalog
# ============================================================
FUNDS = [
    # Foreign equity (currency-exposed)
    ("5124532", "תכלית TTF (4D) NASDAQ 100", "חו\"ל חשופי מטבע"),
    ("5113998", "תכלית TTF (4D) S&P 500", "חו\"ל חשופי מטבע"),
    ("5137666", "תכלית TTF (4D) משולבת S&P 500 (70%) Nasdaq 100 (30%) חודשי", "חו\"ל חשופי מטבע"),
    ("5141676", "תכלית TTF (4D) S&P 500 Momentum", "חו\"ל חשופי מטבע"),
    ("5138805", "תכלית TTF (4D) S&P 500 Growth", "חו\"ל חשופי מטבע"),
    ("5131198", "תכלית TTF (4D) S&P 500 Screened & Scored", "חו\"ל חשופי מטבע"),
    ("5139084", "תכלית TTF (4D) אינדקס תעשיות ביטחוניות גלובלי Top30 EW", "חו\"ל חשופי מטבע"),
    ("5141718", "תכלית TTF (4D) iNDEX Quantum Computing Ecosystem", "חו\"ל חשופי מטבע"),
    ("5138623", "תכלית TTF (4D) Indxx Blockchain Ecosystem", "חו\"ל חשופי מטבע"),
    ("5139787", "תכלית TTF (4D) CME CF Bitcoin Reference Rate (BRRNY)", "חו\"ל חשופי מטבע"),
    ("5140454", "תכלית TTF (4D) CME CF Ethereum Reference Rate (ETHUSDNY)", "חו\"ל חשופי מטבע"),
    ("5138797", "תכלית TTF (4D) Indxx Global Financial Exchanges And Data", "חו\"ל חשופי מטבע"),
    ("5127329", "תכלית TTF (4D) PHLX Semiconductor Sector", "חו\"ל חשופי מטבע"),
    ("5124581", "תכלית TTF (4D) DJ Industrial Average", "חו\"ל חשופי מטבע"),
    ("5124573", "תכלית TTF (4D) MSCI World", "חו\"ל חשופי מטבע"),
    ("5128756", "תכלית TTF (4D) Dow Jones Internet Composite", "חו\"ל חשופי מטבע"),
    ("5127915", "תכלית TTF (4D) ISE CTA Cloud Computing", "חו\"ל חשופי מטבע"),
    ("5131768", "תכלית TTF (4D) INDXX TOURISM & LEISURE EW", "חו\"ל חשופי מטבע"),
    ("5128939", "תכלית TTF (4D) Indxx US eGaming & Virtual Reality", "חו\"ל חשופי מטבע"),
    ("5128988", "תכלית TTF (4D) Indxx US Junior Cybersecurity", "חו\"ל חשופי מטבע"),
    ("5129945", "תכלית TTF (4D) Indxx US Food-Tech", "חו\"ל חשופי מטבע"),
    ("5129374", "תכלית TTF (4D) Indxx US Industrial Real Estate & Logistics", "חו\"ל חשופי מטבע"),
    ("5138755", "תכלית TTF (4D) MSCI India (USD)", "חו\"ל חשופי מטבע"),
    ("5124557", "תכלית TTF (4D) DAX", "חו\"ל חשופי מטבע"),
    ("5139092", "תכלית TTF (4D) EURO STOXX 50", "חו\"ל חשופי מטבע"),

    # Foreign equity (currency-hedged)
    ("5139720", "תכלית TTF (4A) Russell 2000 מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5123179", "תכלית TTF (4A) NASDAQ 100 מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5123161", "תכלית TTF (4A) S&P 500 מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5141684", "תכלית TTF (4A) S&P 500 Momentum מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5138383", "תכלית TTF (4A) S&P 500 Equal Weight מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5133681", "תכלית TTF (4A) S&P 900 Pure Value מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5141833", "תכלית TTF (4B) Indxx Super Institutional Investors Holdings 13F מנוטרלת דולר", "חו\"ל מנוטרלי מטבע"),
    ("5140637", "תכלית TTF (4A) US Capital Markets iNDEX מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5132162", "תכלית TTF (4A) אינדקס ביג טק 30 ארה\"ב מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5127055", "תכלית TTF (4A) S&P Aerospace & Defense מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5123153", "תכלית TTF (4A) STOXX Europe 600 מנוטרלת אירו", "חו\"ל מנוטרלי מטבע"),
    ("5136171", "תכלית TTF (4A) אינדקס Mega 20 US Banks מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5135074", "תכלית TTF (4A) PHLX Semiconductor Sector מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5134556", "תכלית TTF (4A) Indxx Semiconductor Equipment Providers מנוטרלת דולר", "חו\"ל מנוטרלי מטבע"),
    ("5139761", "תכלית TTF (4A) US REITs iNDEX מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5127063", "תכלית TTF (4B) ISE Cyber Security מנוטרלת דולר", "חו\"ל מנוטרלי מטבע"),
    ("5127600", "תכלית TTF (4A) ISE CTA Cloud Computing מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5131537", "תכלית TTF (4A) NASDAQ Clean Edge Green Energy EW מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5127287", "תכלית TTF (4A) S&P Utilities מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5133335", "תכלית TTF (4A) Nasdaq CTA US Artificial Intelligence and Robotics מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5130141", "תכלית TTF (4A) Nasdaq Golden Dragon China מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),
    ("5132923", "תכלית TTF (4A) אינדקס ביג טק 30 סין מנוטרלת דולר", "חו\"ל מנוטרלי מטבע"),
    ("5141627", "תכלית TTF (4A) LBMA Gold Price AM מנוטרלת מט\"ח", "חו\"ל מנוטרלי מטבע"),

    # Mixed
    ("5140025", "תכלית TTF (40) משולבת מניות מקומיות חודשי", "משולבות"),
    ("5139191", "תכלית TTF (40) משולבת מניות ישראל חודשי", "משולבות"),
    ("5121322", "תכלית TTF (4D) משולבת סל מניות חו\"ל חודשי", "משולבות"),
    ("5117346", "תכלית TTF (A2) משולבת אגח ממשלתי קונצרני (85%) מניות (15%) מנוטרלת מט\"ח חודשי", "משולבות"),
    ("5118724", "תכלית TTF (B2) משולבת אגח ממשלתי קונצרני (90%) מניות (20%) מנוטרלת מט\"ח חודשי", "משולבות"),
    ("5115837", "תכלית TTF (A2) משולבת אגח ממשלתי קונצרני (90%) מניות (10%) חודשי", "משולבות"),

    # Israeli equity
    ("5109418", "תכלית TTF (40) ת\"א 35", "מניות בארץ"),
    ("5118740", "תכלית TTF (40) ת\"א 90", "מניות בארץ"),
    ("5139852", "תכלית TTF (40) ת\"א 90 ובנקים", "מניות בארץ"),
    ("5114657", "תכלית TTF (40) ת\"א 125", "מניות בארץ"),
    ("5142039", "תכלית TTF (4A) ת\"א נדל\"ן-35", "מניות בארץ"),
    ("5140736", "תכלית TTF (4A) אינדקס Small-Mid Cap 150 ישראל", "מניות בארץ"),
    ("5138813", "תכלית TTF (4C) אינדקס ישראליות צמיחה-מומנטום", "מניות בארץ"),
    ("5141882", "תכלית TTF (4A) אינדקס תעשיות ביטחוניות ישראל", "מניות בארץ"),
    ("5140975", "תכלית TTF (4A) אינדקס תשתיות חיוניות ובנייה בישראל", "מניות בארץ"),
    ("5141429", "תכלית TTF (4B) אינדקס שוק ההון ישראל", "מניות בארץ"),
    ("5131925", "תכלית TTF (40) אינדקס בנקים ישראל", "מניות בארץ"),
    ("5133582", "תכלית TTF (40) ת\"א-ביטוח ושירותים פיננסים", "מניות בארץ"),
    ("5128970", "תכלית TTF (4A) ת\"א-פמילי", "מניות בארץ"),
    ("5133541", "תכלית TTF (40) ת\"א-בנייה", "מניות בארץ"),
    ("5127584", "תכלית TTF (4A) ת\"א סקטור-באלאנס", "מניות בארץ"),

    # Index corporate bonds
    ("5139779", "תכלית TTF (00) אינדקס צמוד 1-3 פקטור מרווח מאג\"ח ממשלתי", "אינדקס אג\"ח חברות"),
    ("5124425", "תכלית TTF (00) אינדקס מדורג 2-5 מאוזן", "אינדקס אג\"ח חברות"),
    ("5124417", "תכלית TTF (00) אינדקס מדורג 5+ מאוזן", "אינדקס אג\"ח חברות"),
    ("5136031", "תכלית TTF (00) אינדקס ישראל AA מאוזן 2-4", "אינדקס אג\"ח חברות"),
    ("5132535", "תכלית TTF (00) אינדקס ישראל A ומעלה פקטור מרווח מאג\"ח ממשלתי", "אינדקס אג\"ח חברות"),
    ("5133376", "תכלית TTF (00) אינדקס ישראל צמוד A ומעלה פקטור מרווח מאג\"ח ממשלתי", "אינדקס אג\"ח חברות"),
    ("5134390", "תכלית TTF (00) אינדקס ישראל שקלי A ומעלה פקטור מרווח מאג\"ח ממשלתי", "אינדקס אג\"ח חברות"),
    ("5137328", "תכלית TTF (00) אינדקס AAA-AA 0-3 - פקטור מינוף פיננסי נמוך", "אינדקס אג\"ח חברות"),
    ("5136023", "תכלית TTF (00) אינדקס AA-A לפדיון 2028 (מתגלגל כל 3 שנים)", "אינדקס אג\"ח חברות"),
    ("5138417", "תכלית TTF (00) אינדקס AAA-AA 5+ פקטור מינוף פיננסי נמוך", "אינדקס אג\"ח חברות"),
    ("5124409", "תכלית TTF (00) אינדקס HY-BBB כללי", "אינדקס אג\"ח חברות"),
    ("5138086", "תכלית TTF (00) אינדקס CoCo ישראל-10", "אינדקס אג\"ח חברות"),
    ("5125067", "תכלית TTF (00) אינדקס שקלי מדורג תקרת סדרה 500 מ'", "אינדקס אג\"ח חברות"),

    # Corporate bonds
    ("5135819", "תכלית TTF (00) תל בונד-צמודות 1-3", "אג\"ח קונצרני"),
    ("5115472", "תכלית TTF (00) תל בונד 20 צמודות", "אג\"ח קונצרני"),
    ("5136965", "תכלית TTF (00) תל בונד 60 צמודות", "אג\"ח קונצרני"),
    ("5118757", "תכלית TTF (00) תל בונד צמודות-בנקים ללא COCO", "אג\"ח קונצרני"),
    ("5130158", "תכלית TTF (00) תל בונד צמודות AAA-AA", "אג\"ח קונצרני"),
    ("5136916", "תכלית TTF (0A) תל בונד מאגר", "אג\"ח קונצרני"),
    ("5135140", "תכלית TTF (00) תל בונד-שקלי A", "אג\"ח קונצרני"),
    ("5130836", "תכלית TTF (00) תל בונד שקלי AAA-AA", "אג\"ח קונצרני"),
    ("5130828", "תכלית TTF (00) תל בונד שקלי בנקים וביטוח", "אג\"ח קונצרני"),
    ("5114491", "תכלית TTF (00) תל בונד שקלי", "אג\"ח קונצרני"),
    ("5125323", "תכלית TTF (00) תל בונד שקלי 50", "אג\"ח קונצרני"),
    ("5130166", "תכלית TTF (00) תל בונד שקלי 1-3", "אג\"ח קונצרני"),
    ("5130133", "תכלית TTF (00) תל בונד שקלי 3-5", "אג\"ח קונצרני"),
    ("5130174", "תכלית TTF (00) תל בונד שקלי 5-15", "אג\"ח קונצרני"),
    ("5140249", "תכלית TTF (00) תל-בונד בולט 10/2028 צמוד", "אג\"ח קונצרני"),
    ("5140256", "תכלית TTF (00) תל-בונד בולט 2029 ישראל", "אג\"ח קונצרני"),
    ("5140231", "תכלית TTF (00) תל-בונד בולט 2029 שקלי", "אג\"ח קונצרני"),
    ("5128772", "תכלית TTF (0D) All-Bond דולר וטופ 5 בתל בונד-20 צמודות", "אג\"ח קונצרני"),
    ("5138334", "תכלית TTF (0A) S&P 500 Bond Mega 30 Investment Grade 3-5 Year מנוטרלת מט\"ח", "אג\"ח קונצרני"),
    ("5136999", "תכלית TTF (0D) S&P 500 Bond Mega 30 Investment Grade 3-5 Year", "אג\"ח קונצרני"),
    ("5137781", "תכלית TTF (0D) S&P 500 Bond Mega 30 Investment Grade 5-7 Year", "אג\"ח קונצרני"),

    # Government bonds
    ("5137229", "תכלית TTF (00) אינדקס מדינה מאוזן - מח\"מ 4 קבוע", "אג\"ח ממשלתי"),
    ("5118393", "תכלית TTF (0A) תל גוב-כללי", "אג\"ח ממשלתי"),
    ("5108857", "תכלית TTF (00) תל גוב-שקלי 2-5", "אג\"ח ממשלתי"),
    ("5119375", "תכלית TTF (00) תל גוב-שקלי 5+", "אג\"ח ממשלתי"),
    ("5117379", "תכלית TTF (00) תל גוב-צמודות 2-5", "אג\"ח ממשלתי"),
    ("5119383", "תכלית TTF (00) תל גוב-צמודות 5-10", "אג\"ח ממשלתי"),
]


# ============================================================
# Settings
# ============================================================
BASE_URL = "https://www.bizportal.co.il/mutualfunds/quote/performance/{fund_id}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
}
DELAY_BETWEEN_REQUESTS = 0.6  # seconds


# ============================================================
# Parse single fund page
# ============================================================
def fetch_fund_data(fund_id):
    url = BASE_URL.format(fund_id=fund_id)
    try:
        r = SESSION.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"  [X] Network error: {e}")
        return None

    soup = BeautifulSoup(r.text, "html.parser")
    page_text = soup.get_text(" ", strip=True)

    if "טבלת תשואות" not in page_text:
        return None

    data = {
        "price": "",
        "daily": "",
        "weekly": "",
        "month_to_date": "",
        "month_30d": "",
        "months_3": "",
        "ytd": "",
        "months_12": "",
        "years_3": "",
        "years_5": "",
        "y2025": "",
        "y2024": "",
        "y2023": "",
        "y2022": "",
        "stdev_12m": "",
        "sharpe_12m": "",
    }

    price_match = re.search(r"מחיר פדיון\s*([\d,]+\.?\d*)", page_text)
    if price_match:
        data["price"] = price_match.group(1)

    daily_match = re.search(r"מחיר קנייה\s*[\d,]+\.?\d*\s*(-?\d+\.?\d*%)", page_text)
    if daily_match:
        data["daily"] = daily_match.group(1)

    period_map = {
        "שבועי": "weekly",
        "החודש": "month_to_date",
        "30 יום": "month_30d",
        "3 חודשים": "months_3",
        "השנה": "ytd",
        "12 חודשים": "months_12",
        "3 שנים": "years_3",
        "5 שנים": "years_5",
        "תשואה 2025": "y2025",
        "תשואה 2024": "y2024",
        "תשואה 2023": "y2023",
        "תשואה 2022": "y2022",
    }

    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if "תקופה" in headers or any("תקופה" in h for h in headers):
            for row in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in row.find_all("td")]
                if len(cells) >= 2:
                    period = cells[0]
                    fund_return = cells[1]
                    if period in period_map:
                        data[period_map[period]] = fund_return
            break

    for table in soup.find_all("table"):
        headers_text = " ".join(th.get_text(strip=True) for th in table.find_all("th"))
        if "12 חודשים" in headers_text and "36 חודשים" in headers_text:
            for row in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in row.find_all("td")]
                if len(cells) >= 2:
                    label = cells[0]
                    val_12m = cells[1]
                    if "סטיית תקן" in label:
                        data["stdev_12m"] = val_12m
                    elif "שארפ" in label:
                        data["sharpe_12m"] = val_12m
            break

    return data


# ============================================================
# main
# ============================================================
def main():
    print("=" * 60)
    print("TTF Returns Fetcher (Dashboard mode)")
    print("=" * 60)
    print(f"Total funds: {len(FUNDS)}")
    print()

    funds_data = []
    found_count = 0
    not_found_count = 0

    for i, (fund_id, fund_name, category) in enumerate(FUNDS, start=1):
        print(f"[{i:>3}/{len(FUNDS)}] {fund_id}  {fund_name[:55]}")
        data = fetch_fund_data(fund_id)

        item = {
            "fund_id": fund_id,
            "name": fund_name,
            "category": category,
        }

        if data is None:
            item["status"] = "not_found"
            not_found_count += 1
            print(f"        [X] Not found")
        else:
            item.update(data)
            item["status"] = "ok"
            found_count += 1
            print(f"        [OK] daily={data['daily']}  mtd={data['month_to_date']}  ytd={data['ytd']}")

        funds_data.append(item)
        time.sleep(DELAY_BETWEEN_REQUESTS)

    # Save JSON
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    output_path = repo_root / "docs" / "data" / "funds.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "updated_at_display": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "total_funds": len(FUNDS),
        "found": found_count,
        "not_found": not_found_count,
        "funds": funds_data,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print()
    print("=" * 60)
    print(f"[OK] Done")
    print(f"  Found:     {found_count}")
    print(f"  Not found: {not_found_count}")
    print(f"  Output:    {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAborted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
