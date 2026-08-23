from flask import Flask, request, jsonify
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
)

from risk_engine import assess_product

app = Flask(__name__)

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


@app.route("/")
def home():
    return "Food Monitoring Backend is Running!"


# ---------------- Sensor ----------------

@app.route("/api/sensor/reading", methods=["POST"])
def receive_sensor_reading():
    data = request.get_json(silent=True) or {}

    location = data.get("location")
    temperature = data.get("temperature")
    humidity = data.get("humidity")

    if location is None or temperature is None or humidity is None:
        return jsonify({"error": "Missing sensor data"}), 400

    add_reading(location, float(temperature), float(humidity))

    return jsonify({
        "status": "success",
        "message": "Sensor reading stored"
    })


@app.route("/api/sensor/readings", methods=["GET"])
def sensor_readings():
    location = request.args.get("location")
    limit = request.args.get("limit", type=int)
    readings = get_readings()

    if location:
        readings = [r for r in readings if r[2] == location]
    if limit and limit > 0:
        readings = readings[:limit]

    return jsonify([
        {
            "id": reading[0],
            "timestamp": reading[1],
            "location": reading[2],
            "temperature": reading[3],
            "humidity": reading[4]
        }
        for reading in readings
    ])


@app.route("/api/sensor/latest", methods=["GET"])
def latest_sensor_reading():
    reading = get_latest_reading(request.args.get("location"))
    if reading is None:
        return jsonify({"error": "No sensor readings found"}), 404

    return jsonify({
        "id": reading[0],
        "timestamp": reading[1],
        "location": reading[2],
        "temperature": reading[3],
        "humidity": reading[4]
    })


# ---------------- Products ----------------

@app.route("/api/products", methods=["GET"])
def products():
    rows = get_products()
    return jsonify([
        {
            "id": row[0],
            "product_code": row[1],
            "name": row[2],
            "category": row[3],
            "quantity": row[4],
            "expiry_date": row[5],
            "storage_location": row[6],
            "max_temperature": row[7]
        }
        for row in rows
    ])


@app.route("/api/products/<product_code>", methods=["GET"])
def product(product_code):
    row = get_product(product_code)
    if row is None:
        return jsonify({"error": "Product not found"}), 404

    return jsonify({
        "product_code": row[0],
        "name": row[1],
        "category": row[2],
        "quantity": row[3],
        "expiry_date": row[4],
        "storage_location": row[5],
        "max_temperature": row[6]
    })


@app.route("/api/products", methods=["POST"])
def create_product():
    data = request.get_json(silent=True) or {}
    required = [
        "product_code", "name", "category", "quantity",
        "expiry_date", "storage_location", "max_temperature"
    ]
    missing = [key for key in required if data.get(key) in (None, "")]
    if missing:
        return jsonify({"error": "Missing product fields", "fields": missing}), 400

    try:
        add_product(
            data["product_code"],
            data["name"],
            data["category"],
            int(data["quantity"]),
            data["expiry_date"],
            data["storage_location"],
            float(data["max_temperature"])
        )
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            return jsonify({"error": "Product code already exists"}), 409
        return jsonify({"error": "Unable to create product", "details": str(exc)}), 400

    return jsonify({
        "status": "success",
        "message": "Product created",
        "product_code": data["product_code"]
    }), 201


# ---------------- Storage ----------------

@app.route("/api/storage", methods=["GET"])
def storage_locations():
    return jsonify(get_storage_locations())


@app.route("/api/storage/<path:location>", methods=["GET"])
def storage_location(location):
    locations = get_storage_locations()
    match = next((item for item in locations if item["id"] == location or item["name"] == location), None)
    if match is None:
        return jsonify({"error": "Storage location not found"}), 404

    product_rows = [row for row in get_products() if row[6] == match["name"]]
    result = {
        **match,
        "products": [
            {
                "id": row[0],
                "product_code": row[1],
                "name": row[2],
                "category": row[3],
                "quantity": row[4],
                "expiry_date": row[5],
                "storage_location": row[6],
                "max_temperature": row[7]
            }
            for row in product_rows
        ]
    }
    return jsonify(result)


# ---------------- Risk ----------------

@app.route("/api/risk/<product_code>", methods=["GET"])
def get_product_risk(product_code):
    result = assess_product(product_code)

    if "error" in result:
        return jsonify(result), 404

    return jsonify(result)


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False
    )
