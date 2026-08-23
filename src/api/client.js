const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (err) {
    throw new Error('Unable to connect to the monitoring backend.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    if (!response.ok) throw new Error(`Backend error (${response.status}).`);
    throw new Error('Received an unexpected response from the backend.');
  }

  if (!response.ok) {
    throw new Error(body?.error || `Backend error (${response.status}).`);
  }

  return body;
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const qs = query.toString();
  return `${path}${qs ? `?${qs}` : ''}`;
}

export function getSensorReadings({ location, storage_location_id, limit, since } = {}) {
  return request(withQuery('/api/sensor/readings', { location, storage_location_id, limit, since }));
}

export function getLatestSensorReading({ location, storage_location_id } = {}) {
  return request(withQuery('/api/sensor/latest', { location, storage_location_id }));
}

export function getProductRisk(productCode) {
  return request(`/api/risk/${encodeURIComponent(productCode)}`);
}

export function getAllRisk() {
  return request('/api/risk');
}

export function getProducts() {
  return request('/api/products');
}

export function getProduct(productCode) {
  return request(`/api/products/${encodeURIComponent(productCode)}`);
}

export function createProduct(data) {
  return request('/api/products', { method: 'POST', body: JSON.stringify(data) });
}

export function getStorage() {
  return request('/api/storage');
}

export function getStorageLocations() {
  return getStorage();
}

export function getStorageById(id) {
  return request(`/api/storage/${encodeURIComponent(id)}`);
}

export function createStorage(data) {
  return request('/api/storage', { method: 'POST', body: JSON.stringify(data) });
}

export function updateStorage(id, data) {
  return request(`/api/storage/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteStorage(id) {
  return request(`/api/storage/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getAlerts() {
  return request('/api/alerts');
}
