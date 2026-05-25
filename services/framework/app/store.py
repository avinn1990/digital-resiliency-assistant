import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
UPLOADS_DIR = DATA_DIR / "uploads"


class FrameworkStore:
    def __init__(self) -> None:
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, dict] = {}

    def _discover_files(self) -> list[Path]:
        files = list(DATA_DIR.glob("*.json"))
        files.extend(UPLOADS_DIR.glob("*.json"))
        return files

    def list_summaries(self) -> list[dict]:
        summaries = []
        for path in self._discover_files():
            framework = self._load_file(path)
            summaries.append(
                {
                    "id": framework["id"],
                    "name": framework["name"],
                    "version": framework.get("version", "1.0"),
                    "description": framework.get("description", ""),
                }
            )
        return summaries

    def get(self, framework_id: str) -> dict | None:
        if framework_id in self._cache:
            return self._cache[framework_id]
        for path in self._discover_files():
            framework = self._load_file(path)
            if framework["id"] == framework_id:
                self._cache[framework_id] = framework
                return framework
        return None

    def save(self, framework: dict) -> dict:
        framework_id = framework["id"]
        path = UPLOADS_DIR / f"{framework_id}.json"
        with path.open("w", encoding="utf-8") as handle:
            json.dump(framework, handle, indent=2)
        self._cache[framework_id] = framework
        return framework

    def _load_file(self, path: Path) -> dict:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)


store = FrameworkStore()
