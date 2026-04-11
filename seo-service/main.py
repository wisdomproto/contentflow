from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import textstat
import re

app = FastAPI(title="ContentFlow SEO Service")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])

class TextInput(BaseModel):
    text: str
    language: str = "ko"

class KeywordInput(BaseModel):
    text: str
    keywords: list[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze/readability")
def analyze_readability(input: TextInput):
    text = input.text
    sentences = [s.strip() for s in re.split(r'[.!?。！？]', text) if s.strip()]
    words = text.split()
    avg_sl = len(words) / max(len(sentences), 1)

    if input.language == "ko":
        chars = len(text.replace(" ", ""))
        paragraphs = len([p for p in text.split("\n\n") if p.strip()])
        score = min(100, max(0, 100 - abs(avg_sl - 15) * 3))
        return {"score": round(score), "char_count": chars, "sentence_count": len(sentences),
                "paragraph_count": paragraphs, "avg_sentence_length": round(avg_sl, 1),
                "grade": "good" if score >= 70 else "fair" if score >= 50 else "poor"}
    else:
        flesch = textstat.flesch_reading_ease(text)
        grade = textstat.flesch_kincaid_grade(text)
        return {"score": round(max(0, min(100, flesch))), "flesch_reading_ease": round(flesch, 1),
                "flesch_kincaid_grade": round(grade, 1), "sentence_count": len(sentences),
                "word_count": len(words), "avg_sentence_length": round(avg_sl, 1),
                "grade": "good" if flesch >= 60 else "fair" if flesch >= 30 else "poor"}

@app.post("/analyze/keywords")
def analyze_keywords(input: KeywordInput):
    text_lower = input.text.lower()
    wc = len(input.text.split())
    results = []
    for kw in input.keywords:
        count = text_lower.count(kw.lower())
        density = (count / max(wc, 1)) * 100
        results.append({"keyword": kw, "count": count, "density": round(density, 2),
                        "status": "optimal" if 1 <= density <= 2.5 else "low" if density < 1 else "high"})
    return {"keywords": results, "word_count": wc}
