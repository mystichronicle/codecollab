/**
 * API client for communicating with the backend.
 * Handles authentication tokens and HTTP requests.
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async register(email: string, username: string, password: string, fullName?: string) {
    const response = await this.client.post('/api/v1/auth/register', {
      email,
      username,
      password,
      full_name: fullName,
    });
    return response.data;
  }

  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await this.client.post('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/v1/auth/me');
    return response.data;
  }

  async getSessions() {
    const response = await this.client.get('/api/v1/sessions');
    return response.data;
  }

  async createSession(name: string, language: string, description?: string) {
    const response = await this.client.post('/api/v1/sessions', {
      name,
      language,
      description,
    });
    return response.data;
  }

  logout() {
    localStorage.removeItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }
}

export const apiClient = new ApiClient();
