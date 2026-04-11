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

def estimate(kw):
    uri = '/estimate/performance/keyword'
    body = {
        "device": "BOTH",
        "keywordplus": False,
        "key": kw,
        "bids": [500, 1000, 1500, 2000, 3000, 5000, 7000, 10000, 15000, 20000],
    }
    r = requests.post(BASE_URL + uri, json=body, headers=get_header('POST', uri))
    if r.status_code == 200:
        return r.json()
    return None

keywords = [
    "키성장", "키성장병원", "키성장클리닉", "성장클리닉",
    "성장호르몬", "성장호르몬주사", "성장호르몬치료",
    "예측키", "성장판", "성장판검사", "성장판닫히는시기",
    "성조숙증", "성조숙증검사", "성조숙증치료",
    "키크는방법", "키크는음식", "키크는운동", "키크는스트레칭",
    "소아비만", "아이키", "아이키성장", "초등학생키",
    "키성장주사", "강남성장클리닉", "어린이키성장",
    "키크는영양제", "키성장영양제", "성장치료"
]

results = []
for kw in keywords:
    data = estimate(kw)
    if data and 'estimate' in data:
        # Find the bid level that gives meaningful impressions (first page ~ rank 9-10)
        entry = {'keyword': kw, 'bids': []}
        for e in data['estimate']:
            entry['bids'].append({
                'bid': e['bid'],
                'clicks': e['clicks'],
                'impressions': e['impressions'],
                'cost': e['cost']
            })
        results.append(entry)
    time.sleep(0.3)

print(json.dumps(results, ensure_ascii=False, indent=2))
