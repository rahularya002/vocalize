from pathlib import Path

import chromadb


BASE_DB_DIR = Path("db")
BASE_DB_DIR.mkdir(exist_ok=True)


def get_collection(assistant_id: str):
    db_path = BASE_DB_DIR / assistant_id
    db_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(db_path))
    return client.get_or_create_collection(name="knowledge")
