from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn
import requests, os, json

LOGS_API_ENDPOINT = os.environ.get("LOGS_API_ENDPOINT")

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

    # Load the latest logs
    logs_result = requests.get(LOGS_API_ENDPOINT)
    logs_result = json.loads(logs_result.content.decode("utf-8"))
    log_rows = _normalize_mongo_extended(logs_result)
    print(log_rows)

    return templates.TemplateResponse("index.html", {"request": request,
                                                     "log_rows": log_rows})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
