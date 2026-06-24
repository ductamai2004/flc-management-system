/* ─── API Service ─────────────────────────────────────────────────────────── */
const API_BASE = '/api';

const Api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async post(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const errData = await res.json(); msg = errData.message || msg; } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  },

  async put(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const errData = await res.json(); msg = errData.message || msg; } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async uploadFile(endpoint, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  exportUrl(type = 'attendance') {
    return `${API_BASE}/export?type=${type}`;
  }
};
