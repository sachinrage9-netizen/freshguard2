// Centralized API layer: React components should call these functions
// instead of calling fetch() directly. Keeps the backend base URL and
// error handling in one place.
//
// Configurable via VITE_API_URL or VITE_API_BASE_URL (either works, in case
// a .env file already sets one). Defaults to the Flask dev server started
// with `python app.py`.
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
    // Network-level failure (backend not running, CORS, DNS, etc.)
    throw new Error('Unable to connect to monitoring backend.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch (err) {
    // Response wasn't valid JSON.
    if (!response.ok) throw new Error(`Backend error (${response.status}).`);
    throw new Error('Received an unexpected response from the backend.');
  }

  if (!response.ok) {
    throw new Error(body?.error || `Backend error (${response.status}).`);
  }

  return body;
}

// GET /api/sensor/readings[?location=&limit=] -> array of
// { id, timestamp, location, temperature, humidity }
export function getSensorReadings({ location, limit } = {}) {
  const query = new URLSearchParams();
  if (location) query.set('location', location);
  if (limit) query.set('limit', limit);
  const qs = query.toString();
  return request(`/api/sensor/readings${qs ? `?${qs}` : ''}`);
}

// GET /api/sensor/latest[?location=] -> single { id, timestamp, location, temperature, humidity }
export function getLatestSensorReading(location) {
  const qs = location ? `?location=${encodeURIComponent(location)}` : '';
  return request(`/api/sensor/latest${qs}`);
}

// GET /api/risk/<product_code> -> risk assessment object (see risk_engine.assess_product)
export function getProductRisk(productCode) {
  return request(`/api/risk/${encodeURIComponent(productCode)}`);
}

// GET /api/products -> array of backend product rows
export function getProducts() {
  return request('/api/products');
}

// GET /api/storage -> array of derived storage locations with latest reading + product count
export function getStorageLocations() {
  return request('/api/storage');
}
