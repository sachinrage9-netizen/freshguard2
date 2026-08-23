// Adapter layer reconciling frontend mock identifiers with backend
// identifiers, now that the backend also exposes /api/products and
// /api/storage directly. Kept as a small, explicit lookup rather than a
// full data-model rewrite (storage_locations table etc. is a later phase).
//
//   - mock product id   'milk'            <-> backend product_code 'MILK001'
//   - mock location name 'Refrigerator 1' <-> backend location name 'Refrigerator-01'

// Only 'milk' has a clear backend counterpart today (backend seed data has
// Paneer/Yogurt, not Curd/Butter/Ice Cream/Lassi — no safe match for those).
const PRODUCT_CODE_MAP = {
  milk: 'MILK001',
};

// Mock location display name -> backend location name. Used so a mock
// location and its real backend equivalent are recognized as the same
// physical storage unit instead of both being shown.
const LOCATION_NAME_MAP = {
  'Refrigerator 1': 'Refrigerator-01',
};

// Returns the backend product_code for a product, or null if it has no known
// backend counterpart. Backend-sourced products already carry `productCode`
// directly; mock/local products are resolved through PRODUCT_CODE_MAP.
export function backendProductCode(product) {
  if (!product) return null;
  if (product.productCode) return product.productCode;
  return PRODUCT_CODE_MAP[product.id] || null;
}

// Resolves any location name (mock or already-backend) to its backend
// location name, so callers can compare/query without caring which source
// a product's `location` string originally came from.
export function resolveBackendLocation(locationName) {
  if (!locationName) return null;
  return LOCATION_NAME_MAP[locationName] || locationName;
}

// Turns a location name into a stable, URL/key-safe id, e.g.
// 'Refrigerator-01' -> 'refrigerator-01'. Used as the React key/id for
// backend-sourced locations and products.
export function normalizeLocationId(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
