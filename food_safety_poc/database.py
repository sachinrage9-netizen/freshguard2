import sqlite3
from datetime import datetime

DATABASE = "food_monitor.db"

STORAGE_TYPES = ("Refrigerator", "Freezer", "Shelf", "Other")

PRODUCT_COLUMNS = """
    p.id,
    p.product_code,
    p.name,
    p.category,
    p.quantity,
    p.expiry_date,
    p.storage_location,
    p.max_temperature,
    p.storage_location_id,
    p.position_x,
    p.position_y,
    p.position_z,
    p.shelf,
    p.slot,
    p.row,
    p.column
"""


def get_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _table_columns(conn, table):
    return {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}


def _add_column_if_missing(conn, table, column, definition):
    if column not in _table_columns(conn, table):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def _infer_legacy_type(name):
    if name == "Refrigerator-01":
        return "Refrigerator"
    lowered = (name or "").strip().lower()
    if lowered in {"freezer"}:
        return "Freezer"
    if lowered in {"shelf", "shelf 1", "shelf-1"}:
        return "Shelf"
    if lowered in {"refrigerator-01", "refrigerator 1"}:
        return "Refrigerator"
    return "Other"


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

    conn.execute("""
        CREATE TABLE IF NOT EXISTS storage_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            sensor_enabled INTEGER DEFAULT 1,
            width REAL,
            height REAL,
            depth REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    _add_column_if_missing(conn, "products", "storage_location_id", "INTEGER")
    _add_column_if_missing(conn, "products", "position_x", "REAL")
    _add_column_if_missing(conn, "products", "position_y", "REAL")
    _add_column_if_missing(conn, "products", "position_z", "REAL")
    _add_column_if_missing(conn, "products", "shelf", "TEXT")
    _add_column_if_missing(conn, "products", "slot", "TEXT")
    _add_column_if_missing(conn, "products", "row", "TEXT")
    _add_column_if_missing(conn, "products", "column", "TEXT")
    _add_column_if_missing(conn, "sensor_readings", "storage_location_id", "INTEGER")

    _migrate_storage_locations(conn)
    conn.commit()
    conn.close()


def _migrate_storage_locations(conn):
    names = set()
    for (name,) in conn.execute(
        "SELECT DISTINCT storage_location FROM products WHERE storage_location IS NOT NULL AND TRIM(storage_location) != ''"
    ):
        names.add(name.strip())
    for (name,) in conn.execute(
        "SELECT DISTINCT location FROM sensor_readings WHERE location IS NOT NULL AND TRIM(location) != ''"
    ):
        names.add(name.strip())

    if not names:
        names.add("Refrigerator-01")

    existing = {
        row["name"]: row["id"]
        for row in conn.execute("SELECT id, name FROM storage_locations")
    }

    created_at = datetime.utcnow().isoformat(sep=" ", timespec="seconds")

    if "Refrigerator-01" not in existing:
        conn.execute(
            """
            INSERT INTO storage_locations (name, type, sensor_enabled, created_at)
            VALUES (?, ?, 1, ?)
            """,
            ("Refrigerator-01", "Refrigerator", created_at),
        )
        existing["Refrigerator-01"] = conn.execute(
            "SELECT id FROM storage_locations WHERE name = ?",
            ("Refrigerator-01",),
        ).fetchone()["id"]

    for name in names:
        if name in existing:
            continue
        conn.execute(
            """
            INSERT INTO storage_locations (name, type, sensor_enabled, created_at)
            VALUES (?, ?, 1, ?)
            """,
            (name, _infer_legacy_type(name), created_at),
        )
        existing[name] = conn.execute(
            "SELECT id FROM storage_locations WHERE name = ?",
            (name,),
        ).fetchone()["id"]

    for name, storage_id in existing.items():
        conn.execute(
            """
            UPDATE products
            SET storage_location_id = ?
            WHERE storage_location = ? AND storage_location_id IS NULL
            """,
            (storage_id, name),
        )
        conn.execute(
            """
            UPDATE sensor_readings
            SET storage_location_id = ?
            WHERE location = ? AND storage_location_id IS NULL
            """,
            (storage_id, name),
        )


def _row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def _product_dict(row):
    if row is None:
        return None
    data = dict(row)
    return {
        "id": data.get("id"),
        "product_code": data.get("product_code"),
        "name": data.get("name"),
        "category": data.get("category"),
        "quantity": data.get("quantity"),
        "expiry_date": data.get("expiry_date"),
        "storage_location": data.get("storage_location"),
        "max_temperature": data.get("max_temperature"),
        "storage_location_id": data.get("storage_location_id"),
        "position_x": data.get("position_x"),
        "position_y": data.get("position_y"),
        "position_z": data.get("position_z"),
        "shelf": data.get("shelf"),
        "slot": data.get("slot"),
        "row": data.get("row"),
        "column": data.get("column"),
    }


def get_storage_by_id(storage_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM storage_locations WHERE id = ?",
        (storage_id,),
    ).fetchone()
    conn.close()
    return _row_to_dict(row)


def get_storage_by_name(name):
    if not name:
        return None
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM storage_locations WHERE name = ?",
        (str(name).strip(),),
    ).fetchone()
    conn.close()
    return _row_to_dict(row)


def resolve_storage(storage_location_id=None, name=None):
    if storage_location_id not in (None, ""):
        try:
            storage_id = int(storage_location_id)
        except (TypeError, ValueError):
            return None
        return get_storage_by_id(storage_id)
    if name:
        return get_storage_by_name(str(name).strip())
    return None


def add_reading(location, temperature, humidity, storage_location_id=None):
    storage = resolve_storage(storage_location_id, location)
    if storage is None:
        raise ValueError("Unknown storage location")

    conn = get_connection()
    conn.execute(
        """
        INSERT INTO sensor_readings
        (location, temperature, humidity, storage_location_id)
        VALUES (?, ?, ?, ?)
        """,
        (storage["name"], float(temperature), float(humidity), storage["id"]),
    )
    conn.commit()
    conn.close()
    return storage


def add_product(
    product_code,
    name,
    category,
    quantity,
    expiry_date,
    storage_location,
    max_temperature,
    storage_location_id=None,
    position_x=None,
    position_y=None,
    position_z=None,
    shelf=None,
    slot=None,
    row=None,
    column=None,
):
    storage = resolve_storage(storage_location_id, storage_location)
    if storage is None:
        raise ValueError("Unknown storage location")

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
                max_temperature,
                storage_location_id,
                position_x,
                position_y,
                position_z,
                shelf,
                slot,
                row,
                column
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                product_code,
                name,
                category,
                int(quantity),
                expiry_date,
                storage["name"],
                float(max_temperature),
                storage["id"],
                position_x,
                position_y,
                position_z,
                None if shelf in (None, "") else str(shelf),
                None if slot in (None, "") else str(slot),
                None if row in (None, "") else str(row),
                None if column in (None, "") else str(column),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return get_product(product_code)


def get_readings(location=None, storage_location_id=None, limit=None, since=None):
    conn = get_connection()
    query = """
        SELECT id, timestamp, location, temperature, humidity, storage_location_id
        FROM sensor_readings
        WHERE 1=1
    """
    params = []
    if storage_location_id not in (None, ""):
        query += " AND storage_location_id = ?"
        params.append(int(storage_location_id))
    elif location:
        query += " AND location = ?"
        params.append(location)
    if since:
        query += " AND timestamp >= ?"
        params.append(since)
    query += " ORDER BY timestamp DESC, id DESC"
    if limit and int(limit) > 0:
        query += " LIMIT ?"
        params.append(int(limit))
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_readings_for_storage(storage_location_id, since=None):
    conn = get_connection()
    query = """
        SELECT timestamp, temperature, humidity, storage_location_id, location
        FROM sensor_readings
        WHERE storage_location_id = ?
    """
    params = [int(storage_location_id)]
    if since:
        query += " AND timestamp >= ?"
        params.append(since)
    query += " ORDER BY timestamp ASC, id ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_latest_reading(location=None, storage_location_id=None):
    conn = get_connection()
    query = """
        SELECT id, timestamp, location, temperature, humidity, storage_location_id
        FROM sensor_readings
        WHERE 1=1
    """
    params = []
    if storage_location_id not in (None, ""):
        query += " AND storage_location_id = ?"
        params.append(int(storage_location_id))
    elif location:
        query += " AND location = ?"
        params.append(location)
    query += " ORDER BY timestamp DESC, id DESC LIMIT 1"
    row = conn.execute(query, params).fetchone()
    conn.close()
    return _row_to_dict(row)


def get_products():
    conn = get_connection()
    rows = conn.execute(f"""
        SELECT {PRODUCT_COLUMNS}
        FROM products p
        ORDER BY p.expiry_date ASC, p.id ASC
    """).fetchall()
    conn.close()
    return [_product_dict(row) for row in rows]


def get_product(product_code):
    conn = get_connection()
    row = conn.execute(
        f"""
        SELECT {PRODUCT_COLUMNS}
        FROM products p
        WHERE p.product_code = ?
        """,
        (product_code,),
    ).fetchone()
    conn.close()
    return _product_dict(row)


def get_products_for_storage(storage_id):
    conn = get_connection()
    rows = conn.execute(
        f"""
        SELECT {PRODUCT_COLUMNS}
        FROM products p
        WHERE p.storage_location_id = ?
        ORDER BY p.expiry_date ASC, p.id ASC
        """,
        (storage_id,),
    ).fetchall()
    conn.close()
    return [_product_dict(row) for row in rows]


def count_products_for_storage(storage_id):
    conn = get_connection()
    count = conn.execute(
        "SELECT COUNT(*) AS n FROM products WHERE storage_location_id = ?",
        (storage_id,),
    ).fetchone()["n"]
    conn.close()
    return count


def _storage_payload(row, latest=None, product_count=0):
    return {
        "id": row["id"],
        "name": row["name"],
        "type": row["type"],
        "sensor_enabled": bool(row["sensor_enabled"]),
        "sensor": bool(row["sensor_enabled"]) and latest is not None,
        "width": row["width"],
        "height": row["height"],
        "depth": row["depth"],
        "temperature": latest["temperature"] if latest else None,
        "humidity": latest["humidity"] if latest else None,
        "last_updated": latest["timestamp"] if latest else None,
        "product_count": product_count,
        "created_at": row["created_at"],
    }


def get_storage_locations():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM storage_locations ORDER BY name ASC, id ASC"
    ).fetchall()
    locations = []
    for row in rows:
        latest = conn.execute(
            """
            SELECT timestamp, temperature, humidity
            FROM sensor_readings
            WHERE storage_location_id = ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 1
            """,
            (row["id"],),
        ).fetchone()
        product_count = conn.execute(
            "SELECT COUNT(*) AS n FROM products WHERE storage_location_id = ?",
            (row["id"],),
        ).fetchone()["n"]
        locations.append(_storage_payload(row, latest, product_count))
    conn.close()
    return locations


def get_storage_detail(storage_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM storage_locations WHERE id = ?",
        (storage_id,),
    ).fetchone()
    if row is None:
        conn.close()
        return None
    latest = conn.execute(
        """
        SELECT timestamp, temperature, humidity
        FROM sensor_readings
        WHERE storage_location_id = ?
        ORDER BY timestamp DESC, id DESC
        LIMIT 1
        """,
        (storage_id,),
    ).fetchone()
    product_count = conn.execute(
        "SELECT COUNT(*) AS n FROM products WHERE storage_location_id = ?",
        (storage_id,),
    ).fetchone()["n"]
    conn.close()
    payload = _storage_payload(row, latest, product_count)
    payload["products"] = get_products_for_storage(storage_id)
    return payload


def create_storage(name, storage_type, sensor_enabled=1, width=None, height=None, depth=None):
    name = (name or "").strip()
    if not name:
        raise ValueError("Storage name cannot be empty")
    if storage_type not in STORAGE_TYPES:
        raise ValueError("Invalid storage type")
    if get_storage_by_name(name):
        raise ValueError("Storage name already exists")

    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO storage_locations
        (name, type, sensor_enabled, width, height, depth, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            name,
            storage_type,
            1 if sensor_enabled in (True, 1, "1", "true", "True") else 0,
            width,
            height,
            depth,
            datetime.utcnow().isoformat(sep=" ", timespec="seconds"),
        ),
    )
    storage_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_storage_detail(storage_id)


def update_storage(storage_id, fields):
    current = get_storage_by_id(storage_id)
    if current is None:
        return None

    name = current["name"]
    if "name" in fields and fields["name"] is not None:
        name = str(fields["name"]).strip()
        if not name:
            raise ValueError("Storage name cannot be empty")
        other = get_storage_by_name(name)
        if other and other["id"] != int(storage_id):
            raise ValueError("Storage name already exists")

    storage_type = fields.get("type", current["type"])
    if storage_type not in STORAGE_TYPES:
        raise ValueError("Invalid storage type")

    if "sensor_enabled" in fields and fields["sensor_enabled"] is not None:
        sensor_enabled = 1 if fields["sensor_enabled"] in (True, 1, "1", "true", "True") else 0
    else:
        sensor_enabled = current["sensor_enabled"]

    width = current["width"] if "width" not in fields else fields["width"]
    height = current["height"] if "height" not in fields else fields["height"]
    depth = current["depth"] if "depth" not in fields else fields["depth"]

    conn = get_connection()
    conn.execute(
        """
        UPDATE storage_locations
        SET name = ?, type = ?, sensor_enabled = ?, width = ?, height = ?, depth = ?
        WHERE id = ?
        """,
        (name, storage_type, sensor_enabled, width, height, depth, storage_id),
    )
    if name != current["name"]:
        conn.execute(
            "UPDATE products SET storage_location = ? WHERE storage_location_id = ?",
            (name, storage_id),
        )
        conn.execute(
            "UPDATE sensor_readings SET location = ? WHERE storage_location_id = ?",
            (name, storage_id),
        )
    conn.commit()
    conn.close()
    return get_storage_detail(storage_id)


def delete_storage(storage_id):
    current = get_storage_by_id(storage_id)
    if current is None:
        return False
    if count_products_for_storage(storage_id) > 0:
        raise PermissionError("Storage still has products")
    conn = get_connection()
    conn.execute("DELETE FROM sensor_readings WHERE storage_location_id = ?", (storage_id,))
    conn.execute("DELETE FROM storage_locations WHERE id = ?", (storage_id,))
    conn.commit()
    conn.close()
    return True
