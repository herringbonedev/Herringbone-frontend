from fastapi import FastAPI, Request, HTTPException, Form, Body
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn
import requests, os, json, time

LOGS_API_ENDPOINT = os.environ.get("LOGS_API_ENDPOINT")
RULES_API_ENDPOINT = os.environ.get("RULES_API_ENDPOINT")
CARDSET_API = os.environ.get("CARDSET_API")
RECON_SERVICE_URL = os.environ.get("RECON_SERVICE_URL")

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

logs_buffer = []

def _normalize_mongo_extended(x):
    if isinstance(x, dict):
        if set(x.keys()) == {"$oid"}:
            return x["$oid"]
        if set(x.keys()) == {"$date"}:
            v = x["$date"]
            if isinstance(v, dict) and "$numberLong" in v:
                return v["$numberLong"]
            return v
        return {k: _normalize_mongo_extended(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_normalize_mongo_extended(i) for i in x]
    return x

@app.post("/recon-logs")
async def recon_logs(request: Request, body: dict = Body(...)):
    """
    Expects JSON: { "source_address": "1.2.3.4" }
    """
    source_address = body.get("source_address")
    if not source_address:
        raise HTTPException(status_code=400, detail="Missing source_address")

    # Fetch all logs from LOGS_API_ENDPOINT
    try:
        resp = requests.get(LOGS_API_ENDPOINT, timeout=5)
        all_logs = _normalize_mongo_extended(resp.json())
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {e}")

    # Filter logs by source_address
    matching_logs = [log.get("raw_log") for log in all_logs if log.get("source_address") == source_address]

    if not matching_logs:
        raise HTTPException(status_code=404, detail=f"No logs found for {source_address}")

    # Send to recon service
    try:
        recon_resp = requests.post(
            RECON_SERVICE_URL,
            json={"logs": matching_logs}
        )
        recon_resp.raise_for_status()
        return JSONResponse(content=recon_resp.json())
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error sending logs to recon service: {e}")

@app.get("/ruleset", response_class=HTMLResponse)
def ruleset(request: Request):
    logs_result = requests.get(LOGS_API_ENDPOINT)
    log_rows = _normalize_mongo_extended(logs_result.json())

    rules_result = requests.get(RULES_API_ENDPOINT)
    rule_rows = _normalize_mongo_extended(rules_result.json())

    return templates.TemplateResponse("ruleset.html", {"request": request, "rule_rows": rule_rows})

@app.get("/logs", response_class=HTMLResponse)
def logs(request: Request):
    logs_result = requests.get(LOGS_API_ENDPOINT)
    log_rows = _normalize_mongo_extended(logs_result.json())

    return templates.TemplateResponse("logs.html", {"request": request, "log_rows": log_rows})

@app.get("/cards", response_class=HTMLResponse)
def cards(request: Request):
    card_result = requests.get(CARDSET_API + "pull_all_cards")
    card_rows = _normalize_mongo_extended(card_result.json())

    return templates.TemplateResponse("cards.html", {"request": request, "card_rows": card_rows})

@app.post("/cards/delete")
async def delete_card_frontend(selector_type: str = Form(...), selector_value: str = Form(...)):
    payload = {"selector_type": selector_type, "selector_value": selector_value}
    try:
        res = requests.post(CARDSET_API + "delete_cards", json=payload, timeout=5)
        res.raise_for_status()
        data = res.json()
        return JSONResponse(content=data)
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {e}")

@app.get("/stream-logs")
def stream_logs():
    def event_generator():
        last_seen_ids = set()
        while True:
            try:
                resp = requests.get(LOGS_API_ENDPOINT, timeout=2)
                all_logs = _normalize_mongo_extended(resp.json())
                new_logs = [log for log in all_logs if log.get("_id") not in last_seen_ids]

                for log in new_logs:
                    last_seen_ids.add(log.get("_id"))
                    yield f"data: {json.dumps(log)}\n\n"
            except Exception:
                pass
            time.sleep(2)  # poll every 2 seconds
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")
