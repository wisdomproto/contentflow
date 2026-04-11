from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ContentFlow SEO Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze/readability")
def analyze_readability(body: dict):
    """Placeholder — full implementation in Phase 3"""
    return {"score": 0, "message": "Not yet implemented"}
