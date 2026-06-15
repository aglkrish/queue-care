const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Wraps fetch with JSON parsing and consistent error handling.
 * Throws an Error with a useful message if the response is not ok.
 */
async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // ---- Patients ----
  getPatients: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/patients${query ? `?${query}` : ''}`);
  },

  getQueueState: () => request('/api/patients/queue-state'),

  addPatient: (payload) =>
    request('/api/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  callNext: () =>
    request('/api/patients/call-next', {
      method: 'POST',
    }),

  markComplete: (id) =>
    request(`/api/patients/${id}/complete`, {
      method: 'PATCH',
    }),

  removePatient: (id) =>
    request(`/api/patients/${id}`, {
      method: 'DELETE',
    }),

  exportCSVUrl: () => `${API_URL}/api/patients/export`,

  // ---- Settings ----
  getSettings: () => request('/api/settings'),

  updateAverageTime: (averageConsultationTime) =>
    request('/api/settings/average-time', {
      method: 'PUT',
      body: JSON.stringify({ averageConsultationTime }),
    }),

  // ---- Analytics ----
  getAnalytics: () => request('/api/analytics'),
};

export { API_URL };
