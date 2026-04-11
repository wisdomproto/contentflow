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

# Try to get estimated bid/performance for keywords
def get_estimate(keywords):
    uri = '/estimate/performance/keyword'
    method = 'POST'
    body = {
        "device": "BOTH",
        "keywordplus": False,
        "key": keywords[0],
        "bids": [500, 1000, 2000, 3000, 5000],
    }
    headers = get_header(method, uri)
    r = requests.post(BASE_URL + uri, json=body, headers=headers)
    print(f"Estimate [{keywords[0]}] Status: {r.status_code}", file=sys.stderr)
    if r.status_code == 200:
        return r.json()
    else:
        print(f"Error: {r.text[:300]}", file=sys.stderr)
        return None

# Also try the manage keyword tool with different params
def get_keywords_with_bid(kw_list):
    uri = '/keywordstool'
    method = 'GET'
    params = {
        'hintKeywords': ','.join(kw_list),
        'showDetail': '1',
        'includeRecKeyword': 'false'
    }
    headers = get_header('GET', uri)
    r = requests.get(BASE_URL + uri, params=params, headers=headers)
    if r.status_code == 200:
        data = r.json()
        for kw in data.get('keywordList', []):
            if kw.get('relKeyword') in kw_list:
                print(json.dumps(kw, ensure_ascii=False))
    return r.status_code

# Try estimate API
keywords = ["키성장", "성장클리닉", "성조숙증", "성장판검사", "키크는방법"]
for kw in keywords:
    result = get_estimate([kw])
    if result:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    time.sleep(0.5)
