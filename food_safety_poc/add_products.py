from database import init_database, add_product

init_database()

add_product(
    "MILK001",
    "Toned Milk",
    "Dairy",
    24,
    "2026-08-24",
    "Refrigerator-01",
    5.0
)

add_product(
    "PANEER001",
    "Paneer",
    "Dairy",
    12,
    "2026-08-23",
    "Refrigerator-01",
    5.0
)

add_product(
    "YOGURT001",
    "Yogurt",
    "Dairy",
    30,
    "2026-08-27",
    "Refrigerator-01",
    5.0
)

print("Products added successfully!")