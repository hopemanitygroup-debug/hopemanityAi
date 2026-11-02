"""HopeManity BTC-only Binance Spot Testnet gateway. Python 3.11+, stdlib only."""
import hashlib, hmac, json, os, time, urllib.parse, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = "https://testnet.binance.vision"
KEY = os.getenv("BINANCE_TESTNET_API_KEY", "")
SECRET = os.getenv("BINANCE_TESTNET_API_SECRET", "")
ADMIN = os.getenv("HOPEMANITY_ADMIN_TOKEN", "")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8765"))
TRADING = os.getenv("ENABLE_TESTNET_ORDERS", "false").lower() == "true"
MAX_NOTIONAL = min(float(os.getenv("MAX_ORDER_USDT", "100")), 100)
MIN_INTERVAL = 60
last_order_at = 0

def request(method, path, params=None, signed=False):
    params = dict(params or {})
    if signed:
        if not KEY or not SECRET:
            raise ValueError("Testnet API credentials missing")
        params.update(timestamp=int(time.time()*1000), recvWindow=5000)
        query = urllib.parse.urlencode(params)
        sig = hmac.new(SECRET.encode(), query.encode(), hashlib.sha256).hexdigest()
        query += "&signature=" + sig
    else:
        query = urllib.parse.urlencode(params)
    url = BASE + path + ("?" + query if query else "")
    headers = {"X-MBX-APIKEY": KEY} if signed else {}
    req = urllib.request.Request(url, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.load(res)

class Handler(BaseHTTPRequestHandler):
    def send(self, status, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def authorized(self):
        return bool(ADMIN) and hmac.compare_digest(self.headers.get("Authorization",""), "Bearer "+ADMIN)
    def do_GET(self):
        if self.path == "/health":
            return self.send(200, {"service":"HopeManity Testnet","mode":"SPOT_TESTNET","orders_enabled":TRADING,"credentials_configured":bool(KEY and SECRET)})
        if not self.authorized(): return self.send(401,{"error":"Unauthorized"})
        try:
            if self.path == "/market/btc":
                result = request("GET","/api/v3/ticker/price",{"symbol":"BTCUSDT"})
            elif self.path == "/account":
                result = request("GET","/api/v3/account",signed=True)
                result = {"balances":[b for b in result.get("balances",[]) if b["asset"] in ("BTC","USDT")]}
            else: return self.send(404,{"error":"Not found"})
            return self.send(200,result)
        except Exception as e: return self.send(502,{"error":str(e)[:180]})
    def do_POST(self):
        global last_order_at
        if not self.authorized(): return self.send(401,{"error":"Unauthorized"})
        if self.path != "/testnet/order": return self.send(404,{"error":"Not found"})
        if not TRADING: return self.send(403,{"error":"Testnet orders disabled; set ENABLE_TESTNET_ORDERS=true"})
        try:
            length = int(self.headers.get("Content-Length","0"))
            if length > 2048 or length < 1: return self.send(400,{"error":"Invalid body size"})
            data = json.loads(self.rfile.read(length))
            if set(data) != {"side","quote_usdt"}: return self.send(400,{"error":"Only side and quote_usdt allowed"})
            side = data["side"]
            value = float(data["quote_usdt"])
            if side != "BUY": return self.send(400,{"error":"V1 permits BUY only; no shorting or automated SELL"})
            if not (10 <= value <= MAX_NOTIONAL): return self.send(400,{"error":"Outside order cap"})
            if time.monotonic()-last_order_at < MIN_INTERVAL: return self.send(429,{"error":"Order cooldown"})
            # Reserve cooldown before remote request, preventing rapid duplicate requests.
            last_order_at = time.monotonic()
            result = request("POST","/api/v3/order",{"symbol":"BTCUSDT","side":"BUY","type":"MARKET","quoteOrderQty":format(value,'.2f'),"newOrderRespType":"RESULT"},signed=True)
            return self.send(200,{"environment":"TESTNET","order":result})
        except (ValueError,TypeError,KeyError,json.JSONDecodeError) as e: return self.send(400,{"error":str(e)[:180]})
        except urllib.error.HTTPError as e: return self.send(502,{"error":"Binance testnet HTTP "+str(e.code)})
        except Exception as e: return self.send(502,{"error":str(e)[:180]})

if __name__ == "__main__":
    if HOST not in ("127.0.0.1","localhost"):
        raise SystemExit("V1 binds localhost only. Use authenticated TLS reverse proxy for remote access.")
    print("HopeManity Testnet gateway on http://"+HOST+":"+str(PORT))
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
