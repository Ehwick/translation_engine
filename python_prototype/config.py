import json
from pathlib import Path

CONFIG_DIR = Path.home() / ".translation_engine"
CONFIG_FILE = CONFIG_DIR / "config.json"


def load_api_key() -> str:
    if CONFIG_FILE.exists():
        try:
            data = json.loads(CONFIG_FILE.read_text())
            return data.get("deepseek_api_key", "")
        except json.JSONDecodeError:
            return ""
    return ""


def save_api_key(api_key: str) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps({"deepseek_api_key": api_key}))
