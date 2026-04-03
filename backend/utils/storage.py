import json
import shutil
import uuid
from pathlib import Path

from schemas.assistant import AssistantConfig, AssistantCreateRequest


DATA_DIR = Path("backend_data")
DATA_DIR.mkdir(exist_ok=True)
ASSISTANTS_FILE = DATA_DIR / "assistants.json"
DB_DIR = Path("db")


def _load() -> dict[str, dict]:
    if not ASSISTANTS_FILE.exists():
        return {}
    return json.loads(ASSISTANTS_FILE.read_text(encoding="utf-8"))


def _save(data: dict[str, dict]) -> None:
    ASSISTANTS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def create_assistant(payload: AssistantCreateRequest) -> AssistantConfig:
    data = _load()
    assistant_id = str(uuid.uuid4())
    config = AssistantConfig(assistant_id=assistant_id, **payload.model_dump())
    data[assistant_id] = config.model_dump()
    _save(data)
    return config


def get_assistant(assistant_id: str) -> AssistantConfig | None:
    data = _load()
    raw = data.get(assistant_id)
    if not raw:
        return None
    return AssistantConfig(**raw)


def list_assistants() -> list[AssistantConfig]:
    data = _load()
    return [AssistantConfig(**item) for item in data.values()]


def delete_assistant(assistant_id: str) -> bool:
    data = _load()
    if assistant_id not in data:
        return False

    del data[assistant_id]
    _save(data)

    assistant_db_dir = DB_DIR / assistant_id
    if assistant_db_dir.exists():
        shutil.rmtree(assistant_db_dir, ignore_errors=True)

    return True
