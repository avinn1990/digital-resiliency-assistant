from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.store import store

app = FastAPI(
    title="Framework Service",
    description="Stores and serves assessment frameworks you provide",
    version="0.1.0",
)


class FrameworkBody(BaseModel):
    id: str | None = None
    name: str | None = None
    version: str | None = None
    description: str | None = None
    domains: list | None = None

    def to_framework(self) -> dict:
        return self.model_dump(exclude_none=True)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "framework"}


@app.get("/frameworks")
async def list_frameworks() -> list[dict]:
    return store.list_summaries()


@app.get("/frameworks/{framework_id}")
async def get_framework(framework_id: str) -> dict:
    framework = store.get(framework_id)
    if not framework:
        raise HTTPException(status_code=404, detail="Framework not found")
    return framework


@app.post("/frameworks")
async def register_framework(body: dict) -> dict:
    if "id" not in body or "name" not in body or "domains" not in body:
        raise HTTPException(
            status_code=400,
            detail="Framework must include id, name, and domains",
        )
    return store.save(body)
