#!/usr/bin/env python3
"""Block git push when sensitive fields in config.json have non-empty values."""
import json
import os
import sys

SECRET_KEYS = ("token", "key", "secret", "password", "api_key")
CONFIG_PATH = "whatsapp-messenger/config.json"

data = json.load(sys.stdin)
cmd = data.get("tool_input", {}).get("command", "")

if "git push" not in cmd:
    sys.exit(0)

if not os.path.exists(CONFIG_PATH):
    sys.exit(0)

with open(CONFIG_PATH) as f:
    cfg = json.load(f)

leaked = [
    k for k, v in cfg.items()
    if any(x in k.lower() for x in SECRET_KEYS)
    and str(v).strip() not in ("", "null", "None")
]

if leaked:
    print(json.dumps({
        "continue": False,
        "stopReason": f"BLOCKED: Non-empty secret(s) found in {CONFIG_PATH}: {leaked}. Clear the value(s) before pushing."
    }))
