from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn
import requests, os, json

LOGS_API_ENDPOINT = os.environ.get("LOGS_API_ENDPOINT")
RULES_API_ENDPOINT = os.environ.get("RULES_API_ENDPOINT")

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


def _normalize_mongo_extended(x):
    """Collapse {'$oid':...} -> '...', {'$date': ...} -> '...' (str), recursively."""
    if isinstance(x, dict):
        # {"$oid": "..."} → "..."
        if set(x.keys()) == {"$oid"}:
            return x["$oid"]
        # {"$date": "..."} or {"$date": {"$numberLong": "..."}}
        if set(x.keys()) == {"$date"}:
            v = x["$date"]
            if isinstance(v, dict) and "$numberLong" in v:
                return v["$numberLong"]
            return v
        return {k: _normalize_mongo_extended(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_normalize_mongo_extended(i) for i in x]
    return x

@app.get("/", response_class=HTMLResponse)
def home(request: Request):

    try:
        # Load the latest logs
        logs_result = requests.get(LOGS_API_ENDPOINT)
        logs_result = json.loads(logs_result.content.decode("utf-8"))
        log_rows = _normalize_mongo_extended(logs_result)
        print(log_rows)

        # Load rules
        rules_result = requests.get(RULES_API_ENDPOINT)
        rules_result = json.loads(rules_result.content.decode("utf-8"))
        rule_rows = _normalize_mongo_extended(rules_result)
        print(rule_rows)

        return templates.TemplateResponse("index.html", {"request": request,
                                                        "log_rows": log_rows,
                                                        "rule_rows": rule_rows})
    except:
        log_rows = [{"_id": "log12345", "source_address": "192.168.122.1", "raw_log": "2025-09-20T14:12:34Z server01 kernel: [INFO] eth0: packet dropped, src=10.0.0.5 dst=10.0.0.12 proto=UDP len=512", "detection": True, "detection_reason": "Matched rule: Suspicious UDP flood", "recon": True, "detected": False, "recon_data": {"time": "2025-09-20T14:12:34Z", "description": "eth0: packet dropped, src=10.0.0.5 dst=10.0.0.12 proto=UDP len=512"}}, {"_id": "log12346", "source_address": "203.0.113.45", "raw_log": "{'RayID':'7f2c8e3fa72b1234','ClientIP':'203.0.113.45','RequestHost':'example.herringbone.dev','RequestPath':'/api/v1/logs'}", "detection": False, "detection_reason": "No matching rule", "recon": False, "detected": True, "recon_data": {"time": "2025-09-20T15:45:10Z", "description": "Request to /api/v1/logs from client 203.0.113.45"}}]
        rule_rows = [{"type": "detection", "name": "Suspicious UDP Flood", "prompt": "Match logs with repeated UDP packets from same source in < 10s", "data": {"threshold": 100, "protocol": "UDP"}}, {"type": "enrichment", "name": "GeoIP Lookup", "prompt": "Add country and ASN for client IP", "data": {"fields": ["client.ip"], "provider": "MaxMind"}}, {"type": "alert", "name": "High CPU Usage", "prompt": "Trigger alert when CPU > 90% for 5m", "data": {"metric": "cpu.usage", "threshold": 90}}, {"type": "correlation", "name": "Multiple Failed Logins", "prompt": "Detect > 5 failed logins from same IP in 1h", "data": {"threshold": 5, "window": "1h"}}]
        return templates.TemplateResponse("index.html", {"request": request,
                                                        "log_rows": log_rows,
                                                        "rule_rows": rule_rows})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
