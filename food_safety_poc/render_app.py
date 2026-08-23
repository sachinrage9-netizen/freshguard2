import os
import random
import threading
import time
from datetime import datetime, timedelta

import requests
from flask import send_from_directory

from app import app
from database import get_connection, init_database

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(ROOT_DIR, "dist")


def seed_demo_data():
    """Create a small backend-owned demo dataset when a fresh deployment starts."""
    init_database()
    conn = get_connection()
    try:
        storage_count = conn.execute("SELECT COUNT(*) FROM storage_locations").fetchone()[0]
        if storage_count == 0:
            now = datetime.utcnow().isoformat(sep=" ", timespec="seconds")
            storages = [
                ("Refrigerator 1", "Refrigerator", 1, 60, 180, 60),
                ("Freezer", "Freezer", 1, 60, 180, 60),
                ("Shelf 1", "Shelf", 0, 80, 160, 40),
            ]
            conn.executemany(
                "INSERT INTO storage_locations (name,type,sensor_enabled,width,height,depth,created_at) VALUES (?,?,?,?,?,?,?)",
                [(name, kind, sensor, w, h, d, now) for name, kind, sensor, w, h, d in storages],
            )

        product_count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if product_count == 0:
            storage_ids = {
                row["name"]: row["id"]
                for row in conn.execute("SELECT id,name FROM storage_locations")
            }
            today = datetime.utcnow().date()
            products = [
                ("milk", "Toned Milk", "Dairy", 24, today + timedelta(days=2), "Refrigerator 1", 5.0, storage_ids["Refrigerator 1"], 0.0, 0.1, 0.0, "1", "1", "1", "1"),
                ("curd", "Curd", "Dairy", 18, today + timedelta(days=4), "Refrigerator 1", 5.0, storage_ids["Refrigerator 1"], 0.25, 0.1, 0.0, "1", "2", "1", "2"),
                ("butter", "Butter", "Dairy", 32, today + timedelta(days=20), "Refrigerator 1", 5.0, storage_ids["Refrigerator 1"], -0.25, 0.1, 0.0, "1", "3", "1", "3"),
                ("ice-cream", "Ice Cream", "Frozen", 20, today + timedelta(days=12), "Freezer", -15.0, storage_ids["Freezer"], 0.0, 0.1, 0.0, "1", "1", "1", "1"),
                ("lassi", "Lassi", "Drinks", 10, today + timedelta(days=6), "Refrigerator 1", 5.0, storage_ids["Refrigerator 1"], 0.0, -0.2, 0.0, "2", "1", "2", "1"),
            ]
            conn.executemany(
                """INSERT INTO products
                (product_code,name,category,quantity,expiry_date,storage_location,max_temperature,storage_location_id,
                 position_x,position_y,position_z,shelf,slot,row,column)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                products,
            )
        conn.commit()
    finally:
        conn.close()


def sensor_loop():
    """Run the existing sensor idea inside the single Render web service."""
    port = os.environ.get("PORT", "10000")
    endpoint = f"http://127.0.0.1:{port}/api/sensor/reading"
    temperature = 4.0
    humidity = 65.0
    count = 0
    while True:
        count += 1
        if count <= 12:
            temperature = max(3.0, min(5.0, temperature + random.uniform(-0.25, 0.25)))
            phase = "NORMAL"
        elif count <= 24:
            temperature = min(10.0, temperature + random.uniform(0.4, 0.9))
            phase = "EXCURSION"
        elif count <= 36:
            temperature = max(3.5, temperature - random.uniform(0.5, 0.9))
            phase = "RECOVERY"
        else:
            count = 1
            temperature = random.uniform(3.5, 4.5)
            phase = "NORMAL"
        humidity = max(55.0, min(75.0, humidity + random.uniform(-1.0, 1.0)))
        try:
            requests.post(
                endpoint,
                json={
                    "location": "Refrigerator 1",
                    "temperature": round(temperature, 2),
                    "humidity": round(humidity, 2),
                },
                timeout=3,
            )
        except requests.RequestException:
            pass
        time.sleep(5)


# Replace the development-only text response with the real SPA entry point.
def serve_index():
    return send_from_directory(DIST_DIR, "index.html")


app.view_functions["home"] = serve_index


@app.route("/<path:path>")
def frontend(path):
    if path.startswith("api/"):
        return {"error": "API route not found"}, 404
    candidate = os.path.join(DIST_DIR, path)
    if os.path.isfile(candidate):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if os.environ.get("DEPLOYMENT_MODE") == "render":
    seed_demo_data()
    threading.Thread(target=sensor_loop, daemon=True).start()
