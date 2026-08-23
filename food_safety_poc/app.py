import os
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from urllib.parse import urlparse

from database import (
    init_database,
    add_reading,
    add_product,
    get_readings,
    get_latest_reading,
    get_products,
    get_product,
    get_storage_locations,
    get_storage_detail,
    get_storage_by_id,
    create_storage,
    update_storage,
    delete_storage,
    count_products_for_storage,
)
from risk_engine import assess_product, assess_all_products

app = Flask(__name__)

# In the combined Render deployment, Flask serves the already-built Vite app.
# Locally this points at ../dist as well, so the same backend can serve the
# production build without changing the API paths used by the frontend.
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

ALLOWED_ORIGINS = {
    "http://localhost:5175",
    "http://localhost:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5173",
}


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin:
        parsed = urlparse(origin)
        if origin in ALLOWED_ORIGINS or parsed.hostname in {"localhost", "127.0.0.1"}:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Max-Age"] = "3600"
            response.headers["Vary"] = "Origin"
    return response


@app.route("/api/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    return "", 200


init_database()


def _optional_float(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError("Expected a numeric value")


def _product_payload(row):
    return {
        "id": row["id"],
        "product_code": row["product_code"],
        "name": row["name"],
        "category": row["category"],
        "quantity": row["quantity"],
        "expiry_date": row["expiry_date"],
        "storage_location_id": row["storage_location_id"],
        "storage_location": row["storage_location"],
        "max_temperature": row["max_temperature"],
        "position_x": row["position_x"],
        "position_y": row["position_y"],
        "position_z": row["position_z"],
        "shelf": row["shelf"],
        "slot": row["slot"],
        "row": row["row"],
        "column": row["column"],
    }


def _storage_update_fields(data):
    fields = {}
    for key in ("name", "type", "sensor_enabled", "width", "height", "depth"):
        if key in data:
            fields[key] = _optional_float(data[key]) if key in ("width", "height", "depth") else data[key]
    return fields


def _relative_time(timestamp):
    if not timestamp:
        return "just now"
    try:
        value = datetime.fromisoformat(str(timestamp).replace("Z", ""))
    except ValueError:
        return str(timestamp)
    minutes = max(0, int((datetime.utcnow() - value).total_seconds() // 60))
    if minutes < 1:
        return "just now"
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"


# API routes are defined below. The final two routes serve the React build
# after all /api/* routes have had a chance to match.


@app.route("/api/sensor/reading", methods=["POST"])
def receive_sensor_reading():
    data = request.get_json(silent=True) or {}
    location = data.get("location")
    storage_location_id = data.get("storage_location_id")
    temperature = data.get("temperature")
    humidity = data.get("humidity")

    if temperature is None or humidity is None:
        return jsonify({"error": "Missing sensor data"}), 400
    if location in (None, "") and storage_location_id in (None, ""):
        return jsonify({"error": "Missing storage location"}), 400

    try:
        storage = add_reading(location, float(temperature), float(humidity), storage_location_id)
    except (ValueError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({
        "status": "success",
        "message": "Sensor reading stored",
        "storage_location_id": storage["id"],
        "location": storage["name"],
    })


@app.route("/api/sensor/readings", methods=["GET"])
def sensor_readings():
    try:
        readings = get_readings(
            location=request.args.get("location"),
            storage_location_id=request.args.get("storage_location_id"),
            limit=request.args.get("limit", type=int),
            since=request.args.get("since"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(readings)


@app.route("/api/sensor/latest", methods=["GET"])
def latest_sensor_reading():
    try:
        reading = get_latest_reading(
            location=request.args.get("location"),
            storage_location_id=request.args.get("storage_location_id"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if reading is None:
        return jsonify({"error": "No sensor readings found"}), 404
    return jsonify(reading)


@app.route("/api/products", methods=["GET"])
def products():
    return jsonify([_product_payload(row) for row in get_products()])


@app.route("/api/products/<product_code>", methods=["GET"])
def product(product_code):
    row = get_product(product_code)
    if row is None:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(_product_payload(row))


@app.route("/api/products", methods=["POST"])
def create_product():
    data = request.get_json(silent=True) or {}
    required = ["product_code", "name", "category", "quantity", "expiry_date", "max_temperature"]
    missing = [key for key in required if data.get(key) in (None, "")]
    if missing:
        return jsonify({"error": "Missing product fields", "fields": missing}), 400
    if data.get("storage_location_id") in (None, "") and data.get("storage_location") in (None, ""):
        return jsonify({"error": "storage_location_id is required"}), 400

    try:
        created = add_product(
            data["product_code"],
            data["name"],
            data["category"],
            int(data["quantity"]),
            data["expiry_date"],
            data.get("storage_location"),
            float(data["max_temperature"]),
            storage_location_id=data.get("storage_location_id"),
            position_x=_optional_float(data.get("position_x")),
            position_y=_optional_float(data.get("position_y")),
            position_z=_optional_float(data.get("position_z")),
            shelf=data.get("shelf"),
            slot=data.get("slot"),
            row=data.get("row"),
            column=data.get("column"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except (TypeError, OverflowError) as exc:
        return jsonify({"error": f"Invalid product data: {exc}"}), 400
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            return jsonify({"error": "Product code already exists"}), 409
        return jsonify({"error": "Unable to create product", "details": str(exc)}), 400

    return jsonify({
        "status": "success",
        "message": "Product created",
        "product": _product_payload(created),
    }), 201


@app.route("/api/storage", methods=["GET"])
def storage_locations():
    return jsonify(get_storage_locations())


@app.route("/api/storage/<int:storage_id>", methods=["GET"])
def storage_location(storage_id):
    match = get_storage_detail(storage_id)
    if match is None:
        return jsonify({"error": "Storage location not found"}), 404
    return jsonify(match)


@app.route("/api/storage", methods=["POST"])
def create_storage_location():
    data = request.get_json(silent=True) or {}
    try:
        created = create_storage(
            data.get("name"),
            data.get("type"),
            data.get("sensor_enabled", 1),
            width=_optional_float(data.get("width")),
            height=_optional_float(data.get("height")),
            depth=_optional_float(data.get("depth")),
        )
    except ValueError as exc:
        status = 409 if "already exists" in str(exc).lower() else 400
        return jsonify({"error": str(exc)}), status
    return jsonify(created), 201


@app.route("/api/storage/<int:storage_id>", methods=["PUT"])
def update_storage_location(storage_id):
    if get_storage_by_id(storage_id) is None:
        return jsonify({"error": "Storage location not found"}), 404
    try:
        updated = update_storage(storage_id, _storage_update_fields(request.get_json(silent=True) or {}))
    except ValueError as exc:
        status = 409 if "already exists" in str(exc).lower() else 400
        return jsonify({"error": str(exc)}), status
    return jsonify(updated)


@app.route("/api/storage/<int:storage_id>", methods=["DELETE"])
def delete_storage_location(storage_id):
    if get_storage_by_id(storage_id) is None:
        return jsonify({"error": "Storage location not found"}), 404
    try:
        delete_storage(storage_id)
    except PermissionError:
        return jsonify({
            "error": "Cannot delete storage location while products are assigned to it",
            "product_count": count_products_for_storage(storage_id),
        }), 409
    return jsonify({"status": "success", "message": "Storage location deleted"})


@app.route("/api/risk", methods=["GET"])
def get_all_product_risk():
    return jsonify(assess_all_products())


@app.route("/api/risk/<product_code>", methods=["GET"])
def get_product_risk(product_code):
    result = assess_product(product_code)
    if "error" in result:
        return jsonify(result), 404
    return jsonify(result)


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    alerts = []
    now = datetime.utcnow().isoformat(sep=" ", timespec="seconds")
    assessments = [item for item in assess_all_products() if "error" not in item]
    products = {item["product_code"]: item for item in get_products()}
    storages = {item["id"]: item for item in get_storage_locations()}

    for assessment in assessments:
        product_code = assessment["product_code"]
        name = assessment["name"]
        storage_id = assessment["storage_location_id"]
        days = assessment["days_remaining"]
        risk_level = assessment["risk_level"]
        product = products.get(product_code) or {}
        max_safe = product.get("max_temperature", 5)

        if risk_level in ("HIGH", "CRITICAL"):
            alerts.append({
                "id": f"risk-{product_code}",
                "severity": risk_level,
                "title": f"{name} needs attention",
                "message": f"{name} is at {risk_level} risk. {assessment['recommendation']}",
                "product_code": product_code,
                "product_name": name,
                "storage_location_id": storage_id,
                "timestamp": now,
                "status": "open",
                "group": "High priority",
                "time": "just now",
            })

        if days < 0:
            alerts.append({
                "id": f"expired-{product_code}",
                "severity": "CRITICAL",
                "title": f"{name} has expired",
                "message": f"{name} expired {abs(days)} day(s) ago. Remove it from sale.",
                "product_code": product_code,
                "product_name": name,
                "storage_location_id": storage_id,
                "timestamp": now,
                "status": "open",
                "group": "High priority",
                "time": "just now",
            })
        elif days <= 3:
            group = "High priority" if days <= 1 else "Expiring soon"
            alerts.append({
                "id": f"expiry-{product_code}",
                "severity": "HIGH" if days <= 1 else "MODERATE",
                "title": f"{name} expires soon",
                "message": f"{name} expires in {days} day(s). Consider placing it at the front.",
                "product_code": product_code,
                "product_name": name,
                "storage_location_id": storage_id,
                "timestamp": now,
                "status": "open",
                "group": group,
                "time": "just now",
            })

        duration = assessment.get("excursion_duration_minutes") or 0
        if duration > 0:
            storage = storages.get(storage_id) or {}
            current_temp = storage.get("temperature")
            recovered = current_temp is not None and current_temp <= max_safe
            max_temp = assessment.get("max_temperature")
            if max_temp is not None:
                message = f"{storage.get('name', 'Storage')} reached {max_temp:.1f}°C for {duration:.0f} minutes in the last 24 hours."
            else:
                message = f"Temperature stayed above the safe limit for {duration:.0f} minutes."
            alerts.append({
                "id": f"excursion-{storage_id}-{product_code}",
                "severity": "LOW" if recovered else "HIGH",
                "title": "Temperature returned to range" if recovered else "Storage temperature warning",
                "message": message,
                "product_code": product_code,
                "product_name": name,
                "storage_location_id": storage_id,
                "timestamp": storage.get("last_updated") or now,
                "status": "resolved" if recovered else "open",
                "group": "Resolved" if recovered else "High priority",
                "time": "last 24h",
            })

    seen_unsafe = set()
    for storage in storages.values():
        storage_id = storage["id"]
        if storage["sensor_enabled"] and storage["temperature"] is None:
            alerts.append({
                "id": f"sensor-missing-{storage_id}",
                "severity": "MODERATE",
                "title": f"{storage['name']} sensor unavailable",
                "message": f"No sensor readings have been received for {storage['name']}.",
                "product_code": None,
                "product_name": None,
                "storage_location_id": storage_id,
                "timestamp": now,
                "status": "open",
                "group": "High priority",
                "time": "just now",
            })
            continue

        stored_products = [item for item in assessments if item["storage_location_id"] == storage_id]
        if storage["temperature"] is None:
            continue
        limits = [
            products[item["product_code"]]["max_temperature"]
            for item in stored_products
            if item["product_code"] in products
        ]
        unsafe_limit = min(limits) if limits else (5.0 if storage["type"] == "Refrigerator" else None)
        if unsafe_limit is not None and storage["temperature"] > unsafe_limit and storage_id not in seen_unsafe:
            seen_unsafe.add(storage_id)
            alerts.append({
                "id": f"unsafe-{storage_id}",
                "severity": "HIGH",
                "title": f"{storage['name']} is above the safe temperature",
                "message": f"{storage['name']} is currently {storage['temperature']:.1f}°C (limit {unsafe_limit:.1f}°C).",
                "product_code": stored_products[0]["product_code"] if stored_products else None,
                "product_name": stored_products[0]["name"] if stored_products else None,
                "storage_location_id": storage_id,
                "timestamp": storage.get("last_updated") or now,
                "status": "open",
                "group": "High priority",
                "time": _relative_time(storage.get("last_updated")),
            })

    unique = {}
    for alert in alerts:
        unique[alert["id"]] = alert
    return jsonify(list(unique.values()))


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    # Never let the SPA fallback swallow API 404s.
    if path.startswith("api/"):
        return jsonify({"error": "API endpoint not found"}), 404

    if os.path.isdir(FRONTEND_DIST):
        requested = os.path.join(FRONTEND_DIST, path) if path else os.path.join(FRONTEND_DIST, "index.html")
        if path and os.path.isfile(requested):
            return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, "index.html")

    return "Food Monitoring Backend is Running!"


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
