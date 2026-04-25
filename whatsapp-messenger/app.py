#!/usr/bin/env python3
"""
WhatsApp Auto Messenger
שולח הודעות מגניבות אוטומטית בווטסאפ
"""

import json
import time
import random
import schedule
import argparse
from datetime import datetime
from pathlib import Path
from messages import COOL_MESSAGES, get_random_message, get_time_based_message
from sender import WhatsAppSender
from config import load_config


def send_scheduled_message(sender: WhatsAppSender, phone: str, message_type: str):
    msg = get_time_based_message() if message_type == "time" else get_random_message()
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] שולח ל-{phone}: {msg[:50]}...")
    success = sender.send(phone, msg)
    if success:
        print(f"[{timestamp}] ✓ נשלח בהצלחה!")
    else:
        print(f"[{timestamp}] ✗ שליחה נכשלה")


def run_scheduler(config: dict, sender: WhatsAppSender):
    print("\n🚀 מתזמן ההודעות פועל...")
    print("=" * 50)

    for task in config.get("scheduled_tasks", []):
        phone = task["phone"]
        time_str = task["time"]
        msg_type = task.get("message_type", "random")

        schedule.every().day.at(time_str).do(
            send_scheduled_message, sender, phone, msg_type
        )
        print(f"✓ מתוזמן: {phone} בשעה {time_str} ({msg_type})")

    print("=" * 50)
    print("לחץ Ctrl+C לעצירה\n")

    while True:
        schedule.run_pending()
        time.sleep(30)


def send_now(config: dict, sender: WhatsAppSender, phone: str = None, message: str = None):
    recipients = [phone] if phone else config.get("recipients", [])
    if not recipients:
        print("❌ לא הוגדרו נמענים. הוסף ב-config.json או ציין --phone")
        return

    msg = message or get_random_message()
    print(f"\n📨 שולח הודעה ל-{len(recipients)} נמענים...")
    print(f"הודעה: {msg}\n")

    for recipient in recipients:
        success = sender.send(recipient, msg)
        status = "✓" if success else "✗"
        print(f"  {status} {recipient}")
        if len(recipients) > 1:
            time.sleep(2)


def interactive_mode(config: dict, sender: WhatsAppSender):
    print("\n💬 מצב אינטראקטיבי")
    print("=" * 50)

    while True:
        print("\nמה לעשות?")
        print("1. שלח הודעה אקראית מגניבה")
        print("2. שלח הודעה לפי שעה")
        print("3. כתוב הודעה בעצמך")
        print("4. הצג את כל ההודעות")
        print("5. יציאה")

        choice = input("\nבחירה (1-5): ").strip()

        if choice == "1":
            phone = input("מספר טלפון (עם קוד מדינה, לדוג' +972501234567): ").strip()
            send_now(config, sender, phone)

        elif choice == "2":
            phone = input("מספר טלפון: ").strip()
            msg = get_time_based_message()
            print(f"\nהודעה מותאמת שעה: {msg}")
            sender.send(phone, msg)
            print("✓ נשלח!")

        elif choice == "3":
            phone = input("מספר טלפון: ").strip()
            msg = input("ההודעה שלך: ").strip()
            if msg:
                sender.send(phone, msg)
                print("✓ נשלח!")

        elif choice == "4":
            print("\n📋 כל ההודעות המגניבות:")
            for i, msg in enumerate(COOL_MESSAGES, 1):
                print(f"{i}. {msg}")

        elif choice == "5":
            print("\nשלום! 👋")
            break

        else:
            print("בחירה לא תקינה, נסה שוב")


def main():
    parser = argparse.ArgumentParser(
        description="WhatsApp Auto Messenger - שלח הודעות מגניבות אוטומטית"
    )
    parser.add_argument("--mode", choices=["now", "schedule", "interactive"],
                        default="interactive", help="מצב הפעלה")
    parser.add_argument("--phone", help="מספר טלפון ליעד (עם קוד מדינה)")
    parser.add_argument("--message", help="הודעה מותאמת אישית")
    parser.add_argument("--config", default="config.json", help="נתיב לקובץ הגדרות")
    parser.add_argument("--api", choices=["official", "pywhatkit", "simulate"],
                        default="simulate", help="ספק API")
    args = parser.parse_args()

    print("=" * 50)
    print("   📱 WhatsApp Auto Messenger")
    print("   שולח הודעות מגניבות אוטומטית!")
    print("=" * 50)

    config = load_config(args.config)
    sender = WhatsAppSender(api_type=args.api, config=config)

    if args.mode == "now":
        send_now(config, sender, args.phone, args.message)
    elif args.mode == "schedule":
        run_scheduler(config, sender)
    else:
        interactive_mode(config, sender)


if __name__ == "__main__":
    main()
