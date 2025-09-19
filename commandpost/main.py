from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import requests
import uvicorn
import os
import json

LOGS_API_ENDPOINT = os.environ.get("LOGS_API_ENDPOINT")

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def home(request: Request):

    # Load the latest logs
    logs_result = requests.get(LOGS_API_ENDPOINT)
    logs_result = json.loads(logs_result.content.decode("utf-8"))
    print(logs_result)

    return templates.TemplateResponse("index.html", {"request": request})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
