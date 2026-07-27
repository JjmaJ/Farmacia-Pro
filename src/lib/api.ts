// api.ts
// Utility to make authenticated requests to the local Express backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const getAuthToken = () => {
  const tokenStr = localStorage.getItem('medicontrol_auth');
  if (tokenStr) {
    try {
      const auth = JSON.parse(tokenStr);
      return auth.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData = { error: `Error ${response.status}: ${response.statusText}` };
      try {
        errorData = await response.json();
      } catch (e) {
        // Fallback for non-json
      }
      console.error(`API Error ${response.status}:`, errorData);
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    console.log(`API Response (${endpoint}):`, json);
    return json;
  } catch (error: any) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    throw error;
  }
};

export const apiUploadFile = async (endpoint: string, file: File) => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // No set Content-Type, fetch will set it with boundary automatically

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorData = { error: `Error ${response.status}: ${response.statusText}` };
      try {
        errorData = await response.json();
      } catch (e) {
        // Fallback for non-json
      }
      console.error(`API Upload Error ${response.status}:`, errorData);
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    console.log(`API Upload Response (${endpoint}):`, json);
    return json;
  } catch (error: any) {
    console.error(`Failed to upload to ${endpoint}:`, error);
    throw error;
  }
};

