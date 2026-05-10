# -*- coding: utf-8 -*-
"""
Global Indices Scraper (yfinance)
==================================
Pulls performance data for major global indices and ETFs.

Output:
- docs/data/global_indices.json
"""

import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

try:
    import yfinance as yf
except ImportError:
    print("[X] yfinance not installed. Run: pip install yfinance")
    sys.exit(1)


# Order matters - this is how they'll appear in the table
TICKERS = [
    {"symbol": "SPY",      "name": "S&P 500",                  "name_he": "S&P 500",                          "type": "מדד מרכזי"},
    {"symbol": "QQQ",      "name": "Nasdaq-100",                "name_he": "Nasdaq-100",                       "type": "מדד מרכזי"},
    {"symbol": "DIA",      "name": "Dow Jones Industrial",      "name_he": "Dow Jones",                        "type": "מדד מרכזי"},
    {"symbol": "IWM",      "name": "Russell 2000",              "name_he": "Russell 2000",                     "type": "מדד מרכזי"},
    {"symbol": "VTI",      "name": "Total US Market",           "name_he": "Total US Market",                  "type": "מדד מרכזי"},
    {"symbol": "VEA",      "name": "Developed Markets ex-US",   "name_he": "שווקים מפותחים",                    "type": "אזורי"},
    {"symbol": "VWO",      "name": "Emerging Markets",          "name_he": "שווקים מתעוררים",                   "type": "אזורי"},
    {"symbol": "EWJ",      "name": "Japan",                     "name_he": "יפן",                              "type": "אזורי"},
    {"symbol": "MCHI",     "name": "China",                     "name_he": "סין",                              "type": "אזורי"},
    {"symbol": "INDA",     "name": "India",                     "name_he": "הודו",                             "type": "אזורי"},
    {"symbol": "GLD",      "name": "Gold",                      "name_he": "זהב",                              "type": "סחורות"},
    {"symbol": "SLV",      "name": "Silver",                    "name_he": "כסף",                              "type": "סחורות"},
    {"symbol": "USO",      "name": "Oil",                       "name_he": "נפט",                              "type": "סחורות"},
    {"symbol": "TLT",      "name": "20+ Year Treasuries",       "name_he": "אג\"ח אמריקאי 20+ שנים",            "type": "אג\"ח"},
    {"symbol": "IEF",      "name": "7-10 Year Treasuries",      "name_he": "אג\"ח אמריקאי 7-10 שנים",           "type": "אג\"ח"},
    {"symbol": "BTC-USD",  "name": "Bitcoin",                   "name_he": "ביטקוין",                          "type": "קריפטו"},
    {"symbol": "ETH-USD",  "name": "Ethereum",                  "name_he": "את'ריום",                          "type": "קריפטו"},
]


def calc_returns(hist):
    """
    From a price history dataframe, compute returns over various windows.
    All returns include dividend reinvestment via 'auto_adjust=True' on download.
    """
    if hist is None or len(hist) == 0:
        return {}

    closes = hist["Close"]
    last_price = float(closes.iloc[-1])
    last_date = closes.index[-1]

    def pct_change_for_days_back(days):
        target_date = last_date - timedelta(days=days)
        # Find the closest trading day on or before target_date
        candidates = closes.index[closes.index <= target_date]
        if len(candidates) == 0:
            return None
        ref_date = candidates[-1]
        ref_price = float(closes.loc[ref_date])
        if ref_price == 0:
            return None
        return ((last_price / ref_price) - 1) * 100

    def pct_change_ytd():
        year = last_date.year
        # First trading day of this year
        ytd_candidates = closes.index[closes.index.year == year]
        if len(ytd_candidates) == 0:
            return None
        ref_price = float(closes.loc[ytd_candidates[0]])
        if ref_price == 0:
            return None
        return ((last_price / ref_price) - 1) * 100

    def daily_change():
        if len(closes) < 2:
            return None
        prev = float(closes.iloc[-2])
        if prev == 0:
            return None
        return ((last_price / prev) - 1) * 100

    return {
        "price": round(last_price, 2),
        "daily": fmt_pct(daily_change()),
        "weekly": fmt_pct(pct_change_for_days_back(7)),
        "month_to_date": fmt_pct(pct_change_for_days_back(30)),
        "months_3": fmt_pct(pct_change_for_days_back(91)),
        "ytd": fmt_pct(pct_change_ytd()),
        "months_12": fmt_pct(pct_change_for_days_back(365)),
        "years_3": fmt_pct(pct_change_for_days_back(365 * 3)),
        "years_5": fmt_pct(pct_change_for_days_back(365 * 5)),
        "last_close_date": str(last_date.date()),
    }


def fmt_pct(value):
    if value is None:
        return ""
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.2f}%"


def fetch_ticker(symbol):
    """
    Pull ~6 years of history (enough for 5Y returns) for a ticker.
    Uses auto_adjust=True so prices are dividend-adjusted (Total Return).
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="6y", auto_adjust=True, actions=False)
        if len(hist) == 0:
            return None
        return hist
    except Exception as e:
        print(f"   [X] Error fetching {symbol}: {e}")
        return None


def main():
    print("=" * 60)
    print("Global Indices Scraper (yfinance)")
    print("=" * 60)
    print(f"Tickers: {len(TICKERS)}")
    print()

    indices_data = []
    found_count = 0
    not_found_count = 0

    for i, t in enumerate(TICKERS, start=1):
        sym = t["symbol"]
        print(f"[{i:>2}/{len(TICKERS)}] {sym:<10s} {t['name']}")
        hist = fetch_ticker(sym)

        item = {
            "symbol": sym,
            "name": t["name"],
            "name_he": t["name_he"],
            "type": t["type"],
        }

        if hist is None:
            item["status"] = "not_found"
            not_found_count += 1
            print(f"          [X] No data")
        else:
            returns = calc_returns(hist)
            item.update(returns)
            item["status"] = "ok"
            found_count += 1
            print(f"          [OK] price={returns['price']} daily={returns['daily']} ytd={returns['ytd']}")

        indices_data.append(item)

    # Save JSON
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    output_path = repo_root / "docs" / "data" / "global_indices.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "updated_at_display": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "source": "Yahoo Finance via yfinance",
        "total": len(TICKERS),
        "found": found_count,
        "not_found": not_found_count,
        "indices": indices_data,
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
        print("\nAborted.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[X] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
