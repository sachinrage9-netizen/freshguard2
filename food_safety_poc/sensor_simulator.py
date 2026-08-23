import random
import time
import requests

API_URL = "http://127.0.0.1:5000/api/sensor/reading"

location = "Refrigerator-01"

# Starting normal refrigerator conditions
temperature = 4.0
humidity = 65.0

# Number of readings in the current simulation cycle
reading_count = 0

# Each phase lasts a number of readings.
# At 5 seconds per reading, this gives us a visible demo cycle.
NORMAL_READINGS = 12
FAILURE_READINGS = 12
RECOVERY_READINGS = 12

while True:

    reading_count += 1

    # ---------------------------------------------------------
    # PHASE 1 — NORMAL REFRIGERATION
    # Approximately 3–5°C
    # ---------------------------------------------------------
    if reading_count <= NORMAL_READINGS:

        # Slowly fluctuate around the safe refrigerator range
        temperature += random.uniform(-0.25, 0.25)

        # Keep normal operation inside a realistic range
        temperature = max(3.0, min(5.0, temperature))

        phase = "NORMAL"

    # ---------------------------------------------------------
    # PHASE 2 — REFRIGERATION FAILURE
    # Temperature gradually rises above the safe limit
    # ---------------------------------------------------------
    elif reading_count <= NORMAL_READINGS + FAILURE_READINGS:

        temperature += random.uniform(0.4, 0.9)

        # Don't allow the simulation to become absurd
        temperature = min(10.0, temperature)

        phase = "REFRIGERATION FAILURE"

    # ---------------------------------------------------------
    # PHASE 3 — RECOVERY
    # Temperature gradually returns to normal
    # ---------------------------------------------------------
    elif reading_count <= NORMAL_READINGS + FAILURE_READINGS + RECOVERY_READINGS:

        temperature -= random.uniform(0.5, 0.9)

        temperature = max(3.5, temperature)

        phase = "RECOVERY"

    # ---------------------------------------------------------
    # RESET THE CYCLE
    # ---------------------------------------------------------
    else:

        # Start a fresh cycle at a normal temperature
        temperature = random.uniform(3.5, 4.5)

        reading_count = 1

        phase = "NORMAL"

    # Humidity changes gradually
    humidity += random.uniform(-1.0, 1.0)

    # Keep humidity realistic
    humidity = max(55.0, min(75.0, humidity))

    data = {
        "location": location,
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2)
    }

    try:

        response = requests.post(
            API_URL,
            json=data,
            timeout=3
        )

        print(
            f"[{phase}] "
            f"Temperature: {data['temperature']}°C | "
            f"Humidity: {data['humidity']}% | "
            f"Status: {response.status_code}"
        )

    except requests.exceptions.ConnectionError:

        print("Backend is not running.")

    except requests.exceptions.RequestException as error:

        print(f"Sensor request failed: {error}")

    time.sleep(5)