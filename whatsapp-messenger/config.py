"""
ניהול הגדרות האפליקציה
"""

import json
from pathlib import Path

DEFAULT_CONFIG = {
    "api_type": "simulate",
    "whatsapp_token": "",
    "phone_number_id": "",
    "recipients": [
        "+972501234567",
        "+972521234567"
    ],
    "scheduled_tasks": [
        {
            "phone": "+972501234567",
            "time": "08:00",
            "message_type": "time"
        },
        {
            "phone": "+972501234567",
            "time": "21:00",
            "message_type": "random"
        }
    ],
    "contacts": [
        {"name": "יוסי", "phone": "+972501234567"},
        {"name": "דינה", "phone": "+972521234567"}
    ]
}


def load_config(config_path: str = "config.json") -> dict:
    path = Path(config_path)
    if not path.exists():
        print(f"📝 קובץ הגדרות לא נמצא, יוצר {config_path} עם ברירות מחדל...")
        save_config(DEFAULT_CONFIG, config_path)
        return DEFAULT_CONFIG.copy()

    with open(path, "r", encoding="utf-8") as f:
        config = json.load(f)
    print(f"✓ הגדרות נטענו מ-{config_path}")
    return config


def save_config(config: dict, config_path: str = "config.json"):
    path = Path(config_path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    print(f"✓ הגדרות נשמרו ב-{config_path}")
