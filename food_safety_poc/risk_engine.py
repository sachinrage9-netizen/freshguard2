from datetime import date, datetime, timedelta

from database import get_product, get_products, get_readings_for_storage


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


def calculate_excursion_duration(readings, max_temperature=5.0):
    if len(readings) < 2:
        return 0

    total_duration = 0
    excursion_start = None

    for reading in readings:
        timestamp = datetime.fromisoformat(str(reading["timestamp"]))
        temperature = reading["temperature"]

        if temperature > max_temperature:
            if excursion_start is None:
                excursion_start = timestamp
        elif excursion_start is not None:
            total_duration += (timestamp - excursion_start).total_seconds()
            excursion_start = None

    if excursion_start is not None:
        last_timestamp = datetime.fromisoformat(str(readings[-1]["timestamp"]))
        total_duration += (last_timestamp - excursion_start).total_seconds()

    return total_duration


def calculate_temperature_risk(readings, max_temperature=5.0):
    if len(readings) < 2:
        return {
            "temperature_risk": 0,
            "average_temperature": None,
            "max_temperature": None,
            "excursion_count": 0,
            "excursion_duration_minutes": 0,
        }

    temperatures = [reading["temperature"] for reading in readings]
    average_temperature = sum(temperatures) / len(temperatures)
    highest_temperature = max(temperatures)
    duration_seconds = calculate_excursion_duration(readings, max_temperature)
    duration_minutes = duration_seconds / 60
    excursion_count = len([temp for temp in temperatures if temp > max_temperature])

    temperature_excess = highest_temperature - max_temperature

    if temperature_excess <= 0:
        severity_score = 0
    elif temperature_excess <= 2:
        severity_score = 30
    elif temperature_excess <= 5:
        severity_score = 60
    else:
        severity_score = 90

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

    temperature_risk = round(min(100, severity_score * 0.6 + duration_score * 0.4))

    return {
        "temperature_risk": temperature_risk,
        "average_temperature": average_temperature,
        "max_temperature": highest_temperature,
        "excursion_count": excursion_count,
        "excursion_duration_minutes": round(duration_minutes, 2),
    }


def calculate_overall_risk(expiry_risk, temperature_risk):
    return round(min(100, expiry_risk * 0.4 + temperature_risk * 0.6))


def get_risk_level(risk_score):
    if risk_score < 30:
        return "LOW"
    if risk_score < 60:
        return "MODERATE"
    if risk_score < 80:
        return "HIGH"
    return "CRITICAL"


def get_recommendation(risk_level):
    if risk_level == "LOW":
        return "Continue normal storage and monitoring."
    if risk_level == "MODERATE":
        return "Monitor closely and consider prioritizing this batch."
    if risk_level == "HIGH":
        return "Prioritize this batch for sale or use."
    return "Immediate review required. Consider removing the batch from normal inventory."


def get_temperature_history(storage_location_id, hours=24):
    if not storage_location_id:
        return []
    since = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    return get_readings_for_storage(storage_location_id, since=since)


def assess_product(product_code):
    product = get_product(product_code)
    if product is None:
        return {"error": "Product not found"}

    days_remaining, expiry_risk = calculate_expiry_risk(product["expiry_date"])
    readings = get_temperature_history(product["storage_location_id"])
    temperature_result = calculate_temperature_risk(
        readings,
        product["max_temperature"],
    )
    overall_risk = calculate_overall_risk(
        expiry_risk,
        temperature_result["temperature_risk"],
    )
    risk_level = get_risk_level(overall_risk)

    return {
        "product_code": product["product_code"],
        "name": product["name"],
        "category": product["category"],
        "quantity": product["quantity"],
        "expiry_date": product["expiry_date"],
        "storage_location": product["storage_location"],
        "storage_location_id": product["storage_location_id"],
        "days_remaining": days_remaining,
        "expiry_risk": expiry_risk,
        "temperature_risk": temperature_result["temperature_risk"],
        "average_temperature": temperature_result["average_temperature"],
        "max_temperature": temperature_result["max_temperature"],
        "excursion_count": temperature_result["excursion_count"],
        "excursion_duration_minutes": temperature_result["excursion_duration_minutes"],
        "overall_risk": overall_risk,
        "risk_level": risk_level,
        "recommendation": get_recommendation(risk_level),
    }


def assess_all_products():
    return [assess_product(product["product_code"]) for product in get_products()]
