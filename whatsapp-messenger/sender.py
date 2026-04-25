"""
מנגנון שליחת הודעות לווטסאפ
תומך ב: WhatsApp Business API, pywhatkit, ומצב סימולציה
"""

import os
import time
import requests
from datetime import datetime


class WhatsAppSender:
    def __init__(self, api_type: str = "simulate", config: dict = None):
        self.api_type = api_type
        self.config = config or {}

        if api_type == "official":
            self._init_official_api()
        elif api_type == "pywhatkit":
            self._init_pywhatkit()
        else:
            print("📋 מצב סימולציה פעיל (לא נשלחות הודעות אמיתיות)")

    def _init_official_api(self):
        self.token = os.getenv("WHATSAPP_TOKEN") or self.config.get("whatsapp_token")
        self.phone_id = os.getenv("WHATSAPP_PHONE_ID") or self.config.get("phone_number_id")
        if not self.token or not self.phone_id:
            raise ValueError(
                "חסרים פרטי API!\n"
                "הגדר WHATSAPP_TOKEN ו-WHATSAPP_PHONE_ID כמשתני סביבה\n"
                "או הוסף ל-config.json"
            )
        self.api_url = f"https://graph.facebook.com/v18.0/{self.phone_id}/messages"
        print("✓ WhatsApp Business API מאותחל")

    def _init_pywhatkit(self):
        try:
            import pywhatkit
            self.pywhatkit = pywhatkit
            print("✓ pywhatkit מאותחל (נדרש WhatsApp Web פתוח בדפדפן)")
        except ImportError:
            raise ImportError(
                "pywhatkit לא מותקן!\n"
                "הרץ: pip install pywhatkit"
            )

    def send(self, phone: str, message: str) -> bool:
        phone = self._normalize_phone(phone)
        if self.api_type == "official":
            return self._send_official(phone, message)
        elif self.api_type == "pywhatkit":
            return self._send_pywhatkit(phone, message)
        else:
            return self._send_simulate(phone, message)

    def _normalize_phone(self, phone: str) -> str:
        phone = phone.strip().replace(" ", "").replace("-", "")
        if phone.startswith("0") and not phone.startswith("+"):
            phone = "+972" + phone[1:]
        return phone

    def _send_official(self, phone: str, message: str) -> bool:
        payload = {
            "messaging_product": "whatsapp",
            "to": phone.lstrip("+"),
            "type": "text",
            "text": {"body": message},
        }
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        try:
            resp = requests.post(self.api_url, json=payload, headers=headers, timeout=10)
            resp.raise_for_status()
            return True
        except requests.RequestException as e:
            print(f"  שגיאת API: {e}")
            return False

    def _send_pywhatkit(self, phone: str, message: str) -> bool:
        now = datetime.now()
        send_hour = now.hour
        send_min = now.minute + 2

        if send_min >= 60:
            send_hour += 1
            send_min -= 60

        try:
            self.pywhatkit.sendwhatmsg(
                phone_no=phone,
                message=message,
                time_hour=send_hour,
                time_min=send_min,
                wait_time=20,
                tab_close=True,
            )
            return True
        except Exception as e:
            print(f"  שגיאת pywhatkit: {e}")
            return False

    def _send_simulate(self, phone: str, message: str) -> bool:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n  [SIMULATION] {timestamp}")
        print(f"  📱 אל: {phone}")
        print(f"  💬 הודעה: {message}")
        print(f"  ─────────────────────────────────")
        time.sleep(0.5)
        return True

    def send_bulk(self, contacts: list[dict], message: str, delay: int = 3) -> dict:
        results = {"success": 0, "failed": 0}
        for contact in contacts:
            phone = contact.get("phone", "")
            name = contact.get("name", "")
            personalized = message.replace("{name}", name) if name else message
            success = self.send(phone, personalized)
            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
            if delay and len(contacts) > 1:
                time.sleep(delay)
        return results
