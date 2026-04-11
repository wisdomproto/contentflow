import hashlib, hmac, time, base64, requests, json, sys

CUSTOMER_ID = "3998741"
API_KEY = "010000000028fbe04c1a2bcce5be909031dd6427a00573c2f0df912eb56c17526ebbb94989"
SECRET_KEY = "AQAAAAAo++BMGivM5b6QkDHdZCegUJPI3C93NbA07r07GFGbMQ=="
BASE_URL = "https://api.searchad.naver.com"

def get_sig(ts, method, uri):
    msg = f"{ts}.{method}.{uri}"
    h = hmac.new(SECRET_KEY.encode('utf-8'), msg.encode('utf-8'), hashlib.sha256)
    return base64.b64encode(h.digest()).decode('utf-8')

def get_header(method, uri):
    ts = str(int(time.time() * 1000))
    return {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Timestamp': ts, 'X-API-KEY': API_KEY,
        'X-Customer': CUSTOMER_ID, 'X-Signature': get_sig(ts, method, uri)
    }

def search_keywords(hint):
    uri = '/keywordstool'
    r = requests.get(BASE_URL + uri, params={'hintKeywords': hint, 'showDetail': '1'}, headers=get_header('GET', uri))
    if r.status_code == 200:
        return r.json().get('keywordList', [])
    return []

def estimate(kw):
    uri = '/estimate/performance/keyword'
    body = {"device": "BOTH", "keywordplus": False, "key": kw,
            "bids": [500, 1000, 1500, 2000, 3000, 5000, 7000, 10000]}
    r = requests.post(BASE_URL + uri, json=body, headers=get_header('POST', uri))
    if r.status_code == 200:
        return r.json()
    return None

# Step 1: Find all prediction-related keywords
hints = [
    "예측키,예측키계산,아이예측키,우리아이예측키",
    "예상키,예상키계산,아이예상키,자녀예상키",
    "키예측,키계산,키계산기,예상신장",
    "아이키몇까지,아이키예측,최종키예측",
    "키성장예측,성인키예측,성인예상키"
]

all_kw = []
for h in hints:
    data = search_keywords(h)
    all_kw.extend(data)
    time.sleep(0.5)

# Filter relevant ones
relevant_terms = ['예측', '예상', '계산', '몇까지', '최종키', '신장']
seen = set()
filtered = []
for kw in all_kw:
    name = kw.get('relKeyword', '')
    if name in seen:
        continue
    if any(t in name for t in relevant_terms) or '키' in name:
        seen.add(name)
        pc = kw.get('monthlyPcQcCnt', 0)
        mob = kw.get('monthlyMobileQcCnt', 0)
        pc = pc if isinstance(pc, (int, float)) else 0
        mob = mob if isinstance(mob, (int, float)) else 0
        total = pc + mob
        if total >= 10:  # minimum search volume
            filtered.append({
                'keyword': name,
                'total_search': total,
                'pc': pc,
                'mobile': mob,
                'competition': kw.get('compIdx', ''),
                'pl_depth': kw.get('plAvgDepth', 0),
            })

filtered.sort(key=lambda x: x['total_search'], reverse=True)

# Step 2: Get bid estimates for top keywords
print("=== KEYWORD SEARCH VOLUMES ===")
for kw in filtered[:30]:
    print(f"{kw['keyword']:25s} | 검색량: {kw['total_search']:>7,} (PC:{kw['pc']:>5,} M:{kw['mobile']:>6,}) | 경쟁: {kw['competition']:4s} | 광고수: {kw['pl_depth']}")

print("\n=== BID ESTIMATES ===")
top_kws = [kw['keyword'] for kw in filtered[:15]]
for kw_name in top_kws:
    data = estimate(kw_name)
    if data and 'estimate' in data:
        print(f"\n{kw_name}:")
        for e in data['estimate']:
            if e['impressions'] > 0 or e['clicks'] > 0:
                cpc = f"{e['cost']//e['clicks']:,}원" if e['clicks'] > 0 else "-"
                print(f"  입찰 {e['bid']:>6,}원 → 노출 {e['impressions']:>5,} | 클릭 {e['clicks']:>3} | 비용 {e['cost']:>8,}원 | CPC {cpc}")
    time.sleep(0.3)
