from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn
import requests, os, json

LOGS_API_ENDPOINT = os.environ.get("LOGS_API_ENDPOINT")
RULES_API_ENDPOINT = os.environ.get("RULES_API_ENDPOINT")
CARDSET_API = os.environ.get("CARDSET_API")

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


@app.get("/ruleset", response_class=HTMLResponse)
def home(request: Request):

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

    return templates.TemplateResponse("ruleset.html", {"request": request,
                                                       "rule_rows": rule_rows})


@app.get("/logs", response_class=HTMLResponse)
def home(request: Request):

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

    return templates.TemplateResponse("logs.html", {"request": request,
                                                    "log_rows": log_rows})


@app.get("/cards", response_class=HTMLResponse)
def home(request: Request):

    # Load cards
    card_result = requests.get(CARDSET_API)
    card_result = json.loads(card_result.content.decode("utf-8"))
    card_rows = _normalize_mongo_extended(card_result)
    print(card_rows)

    return templates.TemplateResponse("cards.html", {"request": request,
                                                    "card_rows": card_rows})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
