"""
FinSight AI -- Merchant auto-categorisation
===========================================
1. The user's own history wins: if they filed "Chai Point" under Food before,
   it goes to Food again.
2. Otherwise a curated keyword map of common Indian merchants and billers.
3. Otherwise unknown (callers may ask the LLM or the user).
"""

from __future__ import annotations

import difflib
from collections import Counter, defaultdict

from app.ml.recurring import normalize_merchant

MERCHANT_RULES: dict[str, tuple[str, ...]] = {
    "Food": (
        "swiggy", "zomato", "blinkit", "zepto", "instamart", "bigbasket", "dmart", "dunzo", "licious", "eatsure",
        "domino", "mcdonald", "kfc", "burger king", "pizza hut", "subway", "starbucks", "chai", "cafe", "coffee",
        "restaurant", "dhaba", "bakery", "grocer", "grocery", "kirana", "milk", "dairy", "vegetable", "fruit",
        "food", "lunch", "dinner", "breakfast", "snack", "tiffin", "canteen", "nature basket", "spencer", "more retail",
    ),
    "Travel": (
        "uber", "ola", "rapido", "irctc", "indigo", "air india", "akasa", "spicejet", "makemytrip", "goibibo",
        "redbus", "cleartrip", "yatra", "ixigo", "metro", "fuel", "petrol", "diesel", "hpcl", "bpcl", "iocl",
        "indian oil", "shell", "fastag", "toll", "parking", "cab", "taxi", "auto", "train", "flight", "bus", "travel",
    ),
    "Rent": ("rent", "landlord", "nobroker", "housing", "maintenance", "society", "pg ", "hostel", "lease"),
    "Shopping": (
        "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "croma", "reliance digital", "decathlon", "ikea",
        "tata cliq", "lenskart", "snapdeal", "firstcry", "pepperfry", "uniqlo", "zara", "h&m", "westside", "lifestyle",
        "shopping", "clothes", "shoes", "electronics", "mall",
    ),
    "Bills": (
        "airtel", "jio", "vodafone", "bsnl", "electricity", "bescom", "tata power", "adani", "msedcl", "tneb",
        "water bill", "gas", "indane", "hp gas", "bharat gas", "broadband", "act fibernet", "hathway", "recharge",
        "insurance", "lic", "premium", "emi", "loan", "credit card bill", "dth", "tata play", "bill", "postpaid",
        "school fee", "tuition", "gym", "cult",
    ),
    "Entertainment": (
        "netflix", "prime video", "hotstar", "spotify", "youtube", "bookmyshow", "pvr", "inox", "steam",
        "playstation", "xbox", "apple music", "gaana", "jiosaavn", "sonyliv", "zee5", "movie", "concert", "game",
        "party", "pub", "bar ", "club",
    ),
}
INCOME_HINTS = ("salary", "payroll", "credited by", "refund", "cashback", "interest", "dividend", "freelance",
                "invoice", "stipend", "bonus", "reimbursement", "received")


def rule_category(text: str) -> str | None:
    hay = f" {(text or '').lower()} "
    best, best_len = None, 0
    for category, keywords in MERCHANT_RULES.items():
        for kw in keywords:
            if kw in hay and len(kw) > best_len:  # prefer the most specific match
                best, best_len = category, len(kw)
    return best


def looks_like_income(text: str) -> bool:
    hay = (text or "").lower()
    return any(h in hay for h in INCOME_HINTS)


def build_history_map(transactions: list[dict]) -> dict[str, str]:
    counts: dict[str, Counter] = defaultdict(Counter)
    for tx in transactions:
        key = normalize_merchant(tx.get("merchant"))
        if key and tx.get("type") == "expense":
            counts[key][tx["category"]] += 1
    return {k: c.most_common(1)[0][0] for k, c in counts.items()}


def categorize(merchant: str | None, note: str | None = None, history: dict[str, str] | None = None) -> dict:
    key = normalize_merchant(merchant)
    if key and history and key in history:
        return {"category": history[key], "confidence": 0.95, "source": "your history"}
    category = rule_category(f"{merchant or ''} {note or ''}")
    if category:
        return {"category": category, "confidence": 0.8, "source": "merchant rules"}
    return {"category": None, "confidence": 0.0, "source": "unknown"}


# Brand names worth correcting when speech-to-text or OCR garbles them ("Swigdi" -> "Swiggy").
KNOWN_BRANDS = (
    "Swiggy", "Zomato", "Blinkit", "Zepto", "Instamart", "BigBasket", "DMart", "Uber", "Ola", "Rapido", "IRCTC",
    "IndiGo", "MakeMyTrip", "Amazon", "Flipkart", "Myntra", "Ajio", "Meesho", "Nykaa", "Airtel", "Jio", "Netflix",
    "Hotstar", "Spotify", "BookMyShow", "Starbucks", "Domino's", "McDonald's", "KFC", "Croma", "Decathlon", "Lenskart",
)
_BRAND_INDEX = {b.lower().replace("'", ""): b for b in KNOWN_BRANDS}


def canonical_merchant(name: str | None) -> str | None:
    """Snap a near-miss spelling of a well-known brand to its real name; leave everything else alone."""
    if not name:
        return name
    key = name.lower().replace("'", "").strip()
    if key in _BRAND_INDEX:
        return _BRAND_INDEX[key]
    if len(key) < 4:
        return name
    # Speech-to-text keeps the start of a word; requiring the same first two letters avoids false snaps.
    for candidate in difflib.get_close_matches(key, list(_BRAND_INDEX), n=3, cutoff=0.66):
        if candidate[:2] == key[:2]:
            return _BRAND_INDEX[candidate]
    return name
