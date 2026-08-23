// Backend integer storage IDs and product_code values are canonical.
// These helpers only adapt API field names for the existing UI.

export function backendProductCode(product) {
  if (!product) return null;
  return product.productCode || product.product_code || null;
}

export function locationId(value) {
  if (value == null || value === '') return null;
  return String(value);
}

export function resolveBackendLocation(value) {
  if (value == null || value === '') return null;

  // Backend storage locations use integer IDs.
  // Accept an already-canonical ID directly.
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  // Accept numeric strings such as "1", "2", etc.
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  // Older/local UI data may contain a location object.
  if (typeof value === 'object' && value !== null) {
    const candidate =
      value.id ??
      value.backendId ??
      value.storage_location_id ??
      value.storageLocationId;

    if (candidate != null && /^\d+$/.test(String(candidate))) {
      return Number(candidate);
    }
  }

  // Unknown location names cannot safely be converted to a backend ID.
  return null;
}