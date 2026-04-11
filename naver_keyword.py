import hashlib
import hmac
import time
import base64
import requests
import json
import sys

CUSTOMER_ID = "3998741"
API_KEY = "010000000028fbe04c1a2bcce5be909031dd6427a00573c2f0df912eb56c17526ebbb94989"
SECRET_KEY = "AQAAAAAo++BMGivM5b6QkDHdZCegUJPI3C93NbA07r07GFGbMQ=="
BASE_URL = "https://api.searchad.naver.com"

def get_signature(timestamp, method, uri):
    message = f"{timestamp}.{method}.{uri}"
    h = hmac.new(SECRET_KEY.encode('utf-8'), message.encode('utf-8'), hashlib.sha256)
    return base64.b64encode(h.digest()).decode('utf-8')

def get_header(method, uri):
    timestamp = str(int(time.time() * 1000))
    signature = get_signature(timestamp, method, uri)
    return {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Timestamp': timestamp,
        'X-API-KEY': API_KEY,
        'X-Customer': CUSTOMER_ID,
        'X-Signature': signature
    }

def get_keywords(hint):
    uri = '/keywordstool'
    method = 'GET'
    params = {'hintKeywords': hint, 'showDetail': '1'}
    headers = get_header(method, uri)
    r = requests.get(BASE_URL + uri, params=params, headers=headers)
    print(f"[{hint[:20]}...] Status: {r.status_code}", file=sys.stderr)
    if r.status_code != 200:
        print(f"Error: {r.text[:300]}", file=sys.stderr)
        return {}
    return r.json()

groups = [
    "키성장,키성장병원,키성장클리닉,성장클리닉",
    "성장호르몬,성장호르몬주사,성장호르몬치료",
    "예측키,예측키계산,아이예측키",
    "성장판,성장판검사,성장판닫히는시기",
    "성조숙증,성조숙증증상,성조숙증치료",
    "키크는방법,키크는음식,키크는운동",
    "소아비만,소아비만치료,아이비만",
    "아이키,초등학생키,아이키성장",
    "강남성장클리닉,강남키성장"
]

all_kw = []
for g in groups:
    data = get_keywords(g)
    if 'keywordList' in data:
        all_kw.extend(data['keywordList'])
    time.sleep(0.5)

seen = set()
unique = []
for kw in all_kw:
    name = kw.get('relKeyword','')
    if name not in seen:
        seen.add(name)
        unique.append(kw)

for kw in unique:
    pc = kw.get('monthlyPcQcCnt', 0)
    mob = kw.get('monthlyMobileQcCnt', 0)
    pc = pc if isinstance(pc, (int,float)) else 0
    mob = mob if isinstance(mob, (int,float)) else 0
    kw['_total'] = pc + mob

unique.sort(key=lambda x: x['_total'], reverse=True)
print(json.dumps(unique[:80], ensure_ascii=False, indent=2))
