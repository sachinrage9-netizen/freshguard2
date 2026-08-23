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
