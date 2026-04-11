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

def query(kws):
    uri = '/keywordstool'
    r = requests.get(BASE_URL + uri, params={'hintKeywords': kws, 'showDetail': '1'}, headers=get_header('GET', uri))
    if r.status_code == 200:
        return r.json().get('keywordList', [])
    return []

# Exact target keywords only
targets = [
    "키성장", "키성장병원", "성장클리닉", "성장호르몬",
    "성장호르몬주사", "성장호르몬치료", "예측키", "예측키계산",
    "성장판", "성장판검사", "성장판닫히는시기",
    "성조숙증", "성조숙증검사", "성조숙증치료",
    "키크는방법", "키크는음식", "키크는운동", "키크는스트레칭",
    "소아비만", "아이키", "아이키성장", "초등학생키",
    "키성장주사", "키성장영양제", "키크는영양제",
    "강남성장클리닉", "성장클리닉추천", "키성장클리닉",
    "아이성장", "어린이키성장", "성장치료"
]

all_kw = []
# Query in groups of 5
for i in range(0, len(targets), 5):
    group = ",".join(targets[i:i+5])
    data = query(group)
    all_kw.extend(data)
    time.sleep(0.5)

# Filter only our target keywords
target_set = set(t.replace(" ", "") for t in targets)
filtered = []
seen = set()
for kw in all_kw:
    name = kw.get('relKeyword', '').replace(" ", "")
    if name in target_set and name not in seen:
        seen.add(name)
        pc = kw.get('monthlyPcQcCnt', 0)
        mob = kw.get('monthlyMobileQcCnt', 0)
        pc = pc if isinstance(pc, (int, float)) else 0
        mob = mob if isinstance(mob, (int, float)) else 0
        filtered.append({
            'keyword': kw['relKeyword'],
            'pc_search': pc,
            'mobile_search': mob,
            'total_search': pc + mob,
            'competition': kw.get('compIdx', ''),
            'avg_pc_cpc': kw.get('monthlyAvePcCpc', '-'),
            'avg_mobile_cpc': kw.get('monthlyAveMobileCpc', '-'),
            'pl_depth': kw.get('plAvgDepth', 0),
            'pc_ctr': kw.get('monthlyAvePcCtr', 0),
            'mobile_ctr': kw.get('monthlyAveMobileCtr', 0),
        })

filtered.sort(key=lambda x: x['total_search'], reverse=True)
print(json.dumps(filtered, ensure_ascii=False, indent=2))
