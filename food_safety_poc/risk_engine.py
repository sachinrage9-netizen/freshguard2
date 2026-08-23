from datetime import date

from database import (
    get_readings_for_location,
    get_product
)

def calculate_expiry_risk(expiry_date):
    today = date.today()

    expiry = date.fromisoformat(expiry_date)

    days_remaining = (expiry - today).days

    if days_remaining < 0:
        risk = 100
    elif days_remaining == 0:
        risk = 95
    elif days_remaining == 1:
        risk = 80
    elif days_remaining <= 3:
        risk = 60
    elif days_remaining <= 7:
        risk = 35
    elif days_remaining <= 14:
        risk = 15
    else:
        risk = 5

    return days_remaining, risk

def calculate_temperature_risk(
    readings,
    max_temperature=5.0
):

    if len(readings) < 2:
        return {
            "temperature_risk": 0,
            "average_temperature": None,
            "max_temperature": None,
            "excursion_count": 0,
            "excursion_duration_minutes": 0
        }

    temperatures = [
        reading["temperature"]
        for reading in readings
    ]

    average_temperature = (
        sum(temperatures) / len(temperatures)
    )

    highest_temperature = max(temperatures)

    # Calculate excursion duration
    duration_seconds = calculate_excursion_duration(
        readings,
        max_temperature
    )

    duration_minutes = duration_seconds / 60

    excursion_readings = [
        temp
        for temp in temperatures
        if temp > max_temperature
    ]

    excursion_count = len(excursion_readings)

    # -----------------------------
    # Temperature severity
    # -----------------------------

    temperature_excess = (
        highest_temperature - max_temperature
    )

    if temperature_excess <= 0:
        severity_score = 0

    elif temperature_excess <= 2:
        severity_score = 30

    elif temperature_excess <= 5:
        severity_score = 60

    else:
        severity_score = 90

    # -----------------------------
    # Duration score
    # -----------------------------

    if duration_minutes == 0:
        duration_score = 0

    elif duration_minutes <= 10:
        duration_score = 20

    elif duration_minutes <= 30:
        duration_score = 40

    elif duration_minutes <= 60:
        duration_score = 60

    elif duration_minutes <= 120:
        duration_score = 80

    else:
        duration_score = 100

    # -----------------------------
    # Combine severity + duration
    # -----------------------------

    temperature_risk = (
        severity_score * 0.6
        + duration_score * 0.4
    )

    temperature_risk = round(
        min(100, temperature_risk)
    )

    return {
        "temperature_risk": temperature_risk,
        "average_temperature": average_temperature,
        "max_temperature": highest_temperature,
        "excursion_count": excursion_count,
        "excursion_duration_minutes": round(
            duration_minutes,
            2
        )
    }

def calculate_overall_risk(expiry_risk, temperature_risk):

    overall_risk = (
        expiry_risk * 0.4
        + temperature_risk * 0.6
    )

    overall_risk = round(
        min(100, overall_risk)
    )

    return overall_risk

from datetime import datetime


def calculate_excursion_duration(readings, max_temperature=5.0):

    if len(readings) < 2:
        return 0

    total_duration = 0

    excursion_start = None

    for reading in readings:

        timestamp = datetime.fromisoformat(
            reading["timestamp"]
        )

        temperature = reading["temperature"]

        # Temperature has gone above the threshold
        if temperature > max_temperature:

            if excursion_start is None:
                excursion_start = timestamp

        # Temperature has returned to normal
        else:

            if excursion_start is not None:

                duration = (
                    timestamp - excursion_start
                ).total_seconds()

                total_duration += duration

                excursion_start = None

    # Handle an excursion that is still happening
    if excursion_start is not None:

        last_timestamp = datetime.fromisoformat(
            readings[-1]["timestamp"]
        )

        duration = (
            last_timestamp - excursion_start
        ).total_seconds()

        total_duration += duration

    return total_duration

def get_temperature_history(location):

    rows = get_readings_for_location(location)

    readings = []

    for row in rows:

        readings.append({
            "timestamp": row[0],
            "temperature": row[1],
            "humidity": row[2]
        })

    return readings

def assess_product(product_code):

    product = get_product(product_code)

    if product is None:
        return {
            "error": "Product not found"
        }

    (
        product_code,
        name,
        category,
        quantity,
        expiry_date,
        storage_location,
        max_temperature
    ) = product

    # Calculate expiry risk
    days_remaining, expiry_risk = calculate_expiry_risk(
        expiry_date
    )

    # Get sensor history
    readings = get_temperature_history(
        storage_location
    )

    # Calculate temperature risk
    temperature_result = calculate_temperature_risk(
        readings,
        max_temperature
    )

    # Calculate overall risk
    overall_risk = calculate_overall_risk(
        expiry_risk,
        temperature_result["temperature_risk"]
    )

    risk_level = get_risk_level(overall_risk)

    recommendation = get_recommendation(risk_level)

    return {
    "product_code": product_code,
    "name": name,
    "category": category,
    "quantity": quantity,
    "expiry_date": expiry_date,
    "storage_location": storage_location,
    "days_remaining": days_remaining,

    "expiry_risk": expiry_risk,

    "temperature_risk":
        temperature_result["temperature_risk"],

    "average_temperature":
        temperature_result["average_temperature"],

    "max_temperature":
        temperature_result["max_temperature"],

    "excursion_duration_minutes":
        temperature_result["excursion_duration_minutes"],

    "overall_risk": overall_risk,

    "risk_level": risk_level,

    "recommendation": recommendation
}

def get_risk_level(risk_score):

    if risk_score < 30:
        return "LOW"

    elif risk_score < 60:
        return "MODERATE"

    elif risk_score < 80:
        return "HIGH"

    else:
        return "CRITICAL"

def get_recommendation(risk_level):

    if risk_level == "LOW":
        return "Continue normal storage and monitoring."

    elif risk_level == "MODERATE":
        return "Monitor closely and consider prioritizing this batch."

    elif risk_level == "HIGH":
        return "Prioritize this batch for sale or use."

    else:
        return "Immediate review required. Consider removing the batch from normal inventory."