import random
import time
import requests

API_BASE = "http://127.0.0.1:5000"
API_URL = f"{API_BASE}/api/sensor/reading"

LOCATION_NAME = "Refrigerator-01"
storage_location_id = None

temperature = 4.0
humidity = 65.0

NORMAL_READINGS = 12
FAILURE_READINGS = 12
RECOVERY_READINGS = 12


def resolve_storage_id():
    try:
        response = requests.get(f"{API_BASE}/api/storage", timeout=3)
        response.raise_for_status()
        locations = response.json()
        for location in locations:
            if location.get("name") == LOCATION_NAME:
                return location.get("id")
    except requests.exceptions.RequestException:
        return None
    return None


# Resolve once at startup; the backend still accepts the legacy name as a fallback.
storage_location_id = resolve_storage_id()

reading_count = 0

while True:
    reading_count += 1

    if reading_count <= NORMAL_READINGS:
        temperature += random.uniform(-0.25, 0.25)
        temperature = max(3.0, min(5.0, temperature))
        phase = "NORMAL"
    elif reading_count <= NORMAL_READINGS + FAILURE_READINGS:
        temperature += random.uniform(0.4, 0.9)
        temperature = min(10.0, temperature)
        phase = "REFRIGERATION FAILURE"
    elif reading_count <= NORMAL_READINGS + FAILURE_READINGS + RECOVERY_READINGS:
        temperature -= random.uniform(0.5, 0.9)
        temperature = max(3.5, temperature)
        phase = "RECOVERY"
    else:
        temperature = random.uniform(3.5, 4.5)
        reading_count = 1
        phase = "NORMAL"

    humidity += random.uniform(-1.0, 1.0)
    humidity = max(55.0, min(75.0, humidity))

    data = {
        "location": LOCATION_NAME,
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
    }
    if storage_location_id is not None:
        data["storage_location_id"] = storage_location_id

    try:
        response = requests.post(API_URL, json=data, timeout=3)
        if response.ok and storage_location_id is None:
            try:
                storage_location_id = response.json().get("storage_location_id")
            except ValueError:
                pass
        print(
            f"[{phase}] Temperature: {data['temperature']}°C | "
            f"Humidity: {data['humidity']}% | Status: {response.status_code} | "
            f"Storage ID: {storage_location_id or 'name-resolved'}"
        )
    except requests.exceptions.ConnectionError:
        print("Backend is not running.")
    except requests.exceptions.RequestException as error:
        print(f"Sensor request failed: {error}")

    time.sleep(5)
