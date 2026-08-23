import sqlite3

DATABASE = "food_monitor.db"


def get_connection():
    return sqlite3.connect(DATABASE)


def init_database():
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            location TEXT NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            expiry_date DATE NOT NULL,
            storage_location TEXT NOT NULL,
            max_temperature REAL NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def add_reading(location, temperature, humidity):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO sensor_readings
        (location, temperature, humidity)
        VALUES (?, ?, ?)
        """,
        (location, temperature, humidity)
    )
    conn.commit()
    conn.close()


def add_product(
    product_code,
    name,
    category,
    quantity,
    expiry_date,
    storage_location,
    max_temperature
):
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO products
            (
                product_code,
                name,
                category,
                quantity,
                expiry_date,
                storage_location,
                max_temperature
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                product_code,
                name,
                category,
                quantity,
                expiry_date,
                storage_location,
                max_temperature
            )
        )
        conn.commit()
    finally:
        conn.close()


def get_readings():
    conn = get_connection()
    cursor = conn.execute("""
        SELECT id, timestamp, location, temperature, humidity
        FROM sensor_readings
        ORDER BY timestamp DESC, id DESC
    """)
    readings = cursor.fetchall()
    conn.close()
    return readings


def get_readings_for_location(location):
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT timestamp, temperature, humidity
        FROM sensor_readings
        WHERE location = ?
        ORDER BY timestamp ASC, id ASC
        """,
        (location,)
    )
    readings = cursor.fetchall()
    conn.close()
    return readings


def get_latest_reading(location=None):
    conn = get_connection()

    if location:
        cursor = conn.execute(
            """
            SELECT id, timestamp, location, temperature, humidity
            FROM sensor_readings
            WHERE location = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 1
            """,
            (location,)
        )
    else:
        cursor = conn.execute("""
            SELECT id, timestamp, location, temperature, humidity
            FROM sensor_readings
            ORDER BY timestamp DESC, id DESC
            LIMIT 1
        """)

    reading = cursor.fetchone()
    conn.close()
    return reading


def get_products():
    conn = get_connection()
    cursor = conn.execute("""
        SELECT
            id,
            product_code,
            name,
            category,
            quantity,
            expiry_date,
            storage_location,
            max_temperature
        FROM products
        ORDER BY expiry_date ASC, id ASC
    """)
    products = cursor.fetchall()
    conn.close()
    return products


def get_product(product_code):
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT
            product_code,
            name,
            category,
            quantity,
            expiry_date,
            storage_location,
            max_temperature
        FROM products
        WHERE product_code = ?
        """,
        (product_code,)
    )
    product = cursor.fetchone()
    conn.close()
    return product


def get_storage_locations():
    """Return the storage locations currently represented by products/sensors.

    The existing database stores locations as text. We keep that schema for
    backwards compatibility and derive a stable API id from the location name.
    """
    conn = get_connection()
    rows = conn.execute("""
        SELECT location FROM sensor_readings
        UNION
        SELECT storage_location FROM products
        ORDER BY location
    """).fetchall()

    locations = []
    for (name,) in rows:
        latest = conn.execute(
            """
            SELECT timestamp, temperature, humidity
            FROM sensor_readings
            WHERE location = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 1
            """,
            (name,)
        ).fetchone()

        product_count = conn.execute(
            """
            SELECT COUNT(*)
            FROM products
            WHERE storage_location = ?
            """,
            (name,)
        ).fetchone()[0]

        lowered = name.lower()
        if "freezer" in lowered:
            location_type = "Freezer"
        elif "shelf" in lowered:
            location_type = "Shelf"
        elif "refriger" in lowered or "fridge" in lowered:
            location_type = "Refrigerator"
        else:
            location_type = "Storage"

        locations.append({
            "id": name,
            "name": name,
            "type": location_type,
            "sensor": latest is not None,
            "temperature": latest[1] if latest else None,
            "humidity": latest[2] if latest else None,
            "last_updated": latest[0] if latest else None,
            "product_count": product_count
        })

    conn.close()
    return locations
